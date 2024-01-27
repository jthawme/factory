import sharp from "sharp";
import chroma from "chroma-js";
import * as hasha from "hasha";
import mimeTypes from "mime-types";
import path from "path";

import { log, promiseRunner } from "../utils.js";
import { ensureDir, filePath, findFile, relativeFilePath } from "../files.js";
import { getConfigItem } from "../../config.js";

const DEFAULT_SIZES = [320, 640, 768, 1024, 1280, 2400];
const DEFAULT_FALLBACK_SIZE = 768;

const DEFAULT_PLACEHOLDER_SIZE = 10;
const DEFAULT_PLACEHOLDER_QUALITY = 50;

const DEFAULT_API_ENDPOINT = `/_image`;

const DEFAULT_OPTIONS = {
  publicPath: "/assets",

  publicFilePath: (file) => {
    const distImagesFolder = getConfigItem("dist.images");

    return file.startsWith(distImagesFolder)
      ? file.replace(distImagesFolder, getConfigItem("publicPath"))
      : file;
  },

  fallbackSize: DEFAULT_FALLBACK_SIZE,

  sizes: DEFAULT_SIZES,

  placeholder: {
    size: DEFAULT_PLACEHOLDER_SIZE,
    quality: DEFAULT_PLACEHOLDER_QUALITY,
  },

  criticalFilesPrefix: `c`,
  otherFilesPrefix: `_`,

  server: {
    endpoint: DEFAULT_API_ENDPOINT,
  },
};

/**
 * @typedef {object} ImageError
 * @property {false} exists
 *
 * @typedef {object} ImageObjectSource
 * @property {string} [src]
 * @property {string} [srcset]
 * @property {string} type
 * @property {string} sizes
 *
 * @typedef {object} ImageObject
 * @property {string} fallback
 * @property {string} color
 * @property {string} alt
 * @property {string} title
 * @property {ImageObjectSource[]} sources
 * @property {ImageObjectSource[]} placeholders
 * @property {number} width
 * @property {number} height
 * @property {number} aspectRatio
 *
 * @typedef {object} SharpURLObject
 * @property {() => Promise<{dominant: {r: number, g: number, b: number}}>} stats
 * @property {() => Promise<{format: string, width: number, height: number}>} metadata
 * @property {() => SharpURLObject} webp
 * @property {() => SharpURLObject} toFormat
 * @property {() => SharpURLObject} resize
 * @property {true} url
 */

const VALID_FILES = ".jpg|.png|.jpeg|.webp";
const VALID_FILE_CHARS = "a-zA-Z0-9-._/";

// Valid image matcher
const imagePattern = new RegExp(`(${VALID_FILES})$`);

// Checks to see if variable is entirely an image
const fullVariableImagePattern = new RegExp(
  `(^[${VALID_FILE_CHARS}]+(?:.${VALID_FILES})$)`
);

// This looks for an image like word
const inlinePattern = new RegExp(
  `(?<=(?:\\s|^))([${VALID_FILE_CHARS}]+(?:${VALID_FILES}))`
);

// This matches a markdown pattern for an image
const markdownPattern = new RegExp(
  `!\\[.*\\]\\((?:\\s)*([${VALID_FILE_CHARS}]+(?:${VALID_FILES})).*\\)`
);

// This captures the different regions of a markdown image
const deconstructMarkdown = new RegExp(
  `!\\[(.*)\\]\\((?:\\s)*([${VALID_FILE_CHARS}]+(?:${VALID_FILES}))\\s*(?:"(.*?)")?\\)`
);

const getImageConfig = (key) => getConfigItem(`modules.image.${key}`);

const getImageFormat = async (imageNode, passedFormat) => {
  if (passedFormat) {
    return Promise.resolve(passedFormat);
  }

  const { format } = await imageNode.metadata();

  return format;
};

/**
 *
 * @param {string} filePath
 * @returns {SharpURLObject}
 */
const sharpURL = (filePath) => {
  let image = filePath;
  let node = sharp(filePath);

  let format;
  let width;
  let options = {};

  return {
    url: true,

    clone() {
      return this;
    },
    webp() {
      format = "webp";
      return this;
    },
    toFormat(_format, opts = {}) {
      format = _format;
      options = { ...options, ...opts };
      return this;
    },
    resize(_width) {
      width = _width;
      return this;
    },
    metadata() {
      return node.metadata();
    },
    stats() {
      return node.stats();
    },
    toValue() {
      return `${getImageConfig(
        "server.endpoint",
        DEFAULT_API_ENDPOINT
      )}${relativeFilePath(image)}?${new URLSearchParams(
        Object.entries({
          format,
          width,
          ...options,
        })
          .filter(([key, value]) => !!value)
          .reduce((dict, [key, value]) => {
            return {
              ...dict,
              [key]: value,
            };
          }, {})
      ).toString()}`;
    },
  };
};

/**
 * Takes a sharp node, creates a hash of it and saves it out
 *
 * @param {sharp.Sharp | SharpURLObject} imageNode
 * @param {string} [passedFormat]
 * @returns {{
 *  file: string,
 *  absoluteFile: string,
 *  relativeFile: string,
 * }}
 */
const saveImage = async (
  imageNode,
  { format: passedFormat, critical = false } = {}
) => {
  if (!!imageNode?.url) {
    return {
      relativeFile: imageNode.toValue(),
    };
  }

  const distImages = getConfigItem("dist.images");
  const publicFilePathTransform = getImageConfig(
    "publicFilePath",
    (val) => val
  );

  const buffer = await imageNode.toBuffer();
  const hash = await hasha.hash(buffer, {
    algorithm: "md5",
  });

  const format = await getImageFormat(imageNode, passedFormat);

  const mime = mimeTypes.lookup(format);
  const extension = mimeTypes.extension(mime);
  const targetFile = [hash, extension].join(".");
  const absoluteFile = filePath(
    [
      critical
        ? getImageConfig("criticalFilesPrefix")
        : getImageConfig("otherFilesPrefix"),
      targetFile,
    ].join("/"),
    distImages
  );

  await ensureDir(path.dirname(absoluteFile));
  await imageNode.toFile(absoluteFile);
  log(`✅ Saved ${targetFile}`);

  return {
    file: targetFile,
    absoluteFile,
    relativeFile: publicFilePathTransform(absoluteFile),
  };
};

/**
 * Takes a sharp node, creates all the files to do with a source object for responsive images
 *
 * @param {sharp.Sharp} imageNode
 * @param {number} maxWidth,
 * @param {string} passedFormat
 * @param {boolean} critical
 * @returns {ImageObjectSource}
 */
const createSrcSet = async (
  imageNode,
  maxWidth,
  passedFormat,
  critical = false
) => {
  const sizes = getImageConfig("sizes", DEFAULT_SIZES).filter(
    (size) => size < maxWidth
  );

  if (sizes.length === 0) {
    sizes.push(maxWidth);
  }

  const format = await getImageFormat(imageNode, passedFormat);
  const mime = mimeTypes.lookup(format);

  log(`Creating src set: ${sizes.length} sizes`);
  const images = await promiseRunner(sizes, async (size, idx, arr) => {
    return saveImage(imageNode.resize(size), { format, critical });
  });

  return {
    srcset: images
      .map(({ relativeFile }, idx, arr) =>
        idx === arr.length - 1 ? relativeFile : `${relativeFile} ${sizes[idx]}w`
      )
      .join(", "),
    type: mime,
    sizes: [
      ...sizes
        // .slice(0, sizes.length - 1)
        .map((size) => `(max-width: ${size}px) 100vw`),
      "100vw",
    ].join(", "),
  };
};

/**
 * Takes a sharp node, creates a file and source object
 *
 * @param {sharp.Sharp} imageNode
 * @param {string} passedFormat
 * @param {boolean} critical
 * @returns {ImageObjectSource}
 */
const createSrc = async (imageNode, passedFormat, critical = false) => {
  const format = await getImageFormat(imageNode, passedFormat);
  const mime = mimeTypes.lookup(format);

  const image = await saveImage(imageNode, { format, critical });

  return {
    src: image.relativeFile,
    type: mime,
  };
};

/**
 *
 * @param {string} imagePath
 * @param {string} alt
 * @param {string} title
 * @returns {ImageError | ImageObject}
 */
export const transformImage = async (imagePath, alt, title) => {
  const file = await findFile(imagePath);

  if (!file || !imagePattern.test(file)) {
    return {
      exists: false,
      fallback: imagePath,
      alt,
      title,
    };
  }

  const distImages = getConfigItem("dist.images");

  const rootImageNode = getConfigItem("dev") ? sharpURL(file) : sharp(file);
  rootImageNode;
  const placeholderImageNode = rootImageNode
    .clone()
    .resize(
      getImageConfig("placeholder.size", DEFAULT_OPTIONS.placeholder.size)
    );
  const { width, height, format } = await rootImageNode.metadata();
  const { dominant } = await rootImageNode.stats();

  await ensureDir(distImages);

  log(
    `Creating fallback at size ${getImageConfig(
      "fallbackSize",
      DEFAULT_OPTIONS.fallbackSize
    )}`
  );
  const { relativeFile: fallback } = await saveImage(
    rootImageNode.resize(
      getImageConfig("fallbackSize", DEFAULT_OPTIONS.fallbackSize)
    )
  );

  const sources = await Promise.all([
    createSrcSet(rootImageNode.webp(), width, "webp"),
    format !== "webp"
      ? createSrcSet(rootImageNode, width)
      : Promise.resolve(false),
  ]);

  const imageOpts = {
    quality: getImageConfig(
      "placeholder.quality",
      DEFAULT_OPTIONS.placeholder.quality
    ),
  };

  const placeholderSize = getImageConfig(
    "placeholder.size",
    DEFAULT_OPTIONS.placeholder.size
  );

  const placeholders = await Promise.all([
    createSrc(
      placeholderImageNode.webp(imageOpts).resize(placeholderSize),
      "webp",
      true
    ),
    format !== "webp"
      ? createSrc(
          placeholderImageNode
            .toFormat(format, imageOpts)
            .resize(placeholderSize),
          format,
          true
        )
      : Promise.resolve(false),
  ]);

  return {
    fallback,
    sources,
    placeholder: {
      sources: placeholders,
      src: placeholders.at(-1).src,
    },
    color: chroma(dominant).hex(),
    aspectRatio: height / width,
    width,
    height,
    alt,
    title,
  };
};

/**
 *
 * @param {ImageObject} image
 * @returns {string}
 */
const convertImage = (image) => {
  const imageData = {
    ...image,
  };

  return `![${JSON.stringify(imageData)}](${image.fallback}${
    image.title ? ` "${image.title}"` : ""
  })`;
};

const getImageFromMarkdown = (markdownImage) => {
  const [_, alt, imagePath, title] = deconstructMarkdown.exec(markdownImage);

  return [imagePath, alt, title];
};

const createMarker = (val) => {
  return `~-@${val}@-~`;
};

/**
 * @type {import("../../config.js").ConfigTransformMatch}
 */
export const transform = {
  id: "image-transform",
  pattern: /(.jpg|.png|.jpeg|.webp)/gim,
  testValue: true,
  async handler(value, key) {
    const images = [
      ...value.matchAll(
        new RegExp(`${markdownPattern.source}|${inlinePattern.source}`, "gim")
      ),
    ];

    if (images.length) {
      if (fullVariableImagePattern.test(value)) {
        return transformImage(images[0][0]);
      }

      let text = value;

      const converted = await promiseRunner(images, async ([image], idx) => {
        // const r = enclosedPattern(image);
        text = text.replace(image, createMarker(idx));

        if (new RegExp(inlinePattern, "i").test(image)) {
          return transformImage(image);
        } else {
          return transformImage(...getImageFromMarkdown(image));
        }
      });

      converted.forEach((image, idx) => {
        text = text.replace(createMarker(idx), convertImage(image));
      });

      return text;
    }

    return value;
  },
};

export const options = {
  ...DEFAULT_OPTIONS,
};
