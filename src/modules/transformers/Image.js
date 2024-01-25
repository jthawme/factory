import fs from "fs-extra";
import path from "path";
import sharp from "sharp";
import chroma from "chroma-js";
import * as hasha from "hasha";
import mimeTypes from "mime-types";

import { log, promiseRunner } from "../utils.js";
import { ensureDir, filePath, findFile, relativeFilePath } from "../files.js";
import { getConfigItem } from "../../config.js";

const DEFAULT_SIZES = [320, 640, 768, 1024, 1280, 2400];
const DEFAULT_FALLBACK_SIZE = 768;

const DEFAULT_PLACEHOLDER_SIZE = 10;
const DEFAULT_PLACEHOLDER_QUALITY = 50;

const DEFAULT_API_ENDPOINT = `/_image`;

/**
 * @typedef {object} ImageError
 * @property {false} exists
 *
 * @typedef {object} ImageObjectSource
 * @property {string} srcset
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
      return `${getConfigItem(
        "modules.image.server.endpoint",
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
const saveImage = async (imageNode, passedFormat) => {
  if (!!imageNode?.url) {
    return {
      relativeFile: imageNode.toValue(),
    };
  }

  const distImages = getConfigItem("dist.images");
  const publicFilePathTransform = getConfigItem(
    "modules.image.publicFilePath",
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
  const absoluteFile = filePath(targetFile, distImages);

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
 * @returns {ImageObjectSource}
 */
const createSrcSet = async (imageNode, maxWidth, passedFormat) => {
  const sizes = getConfigItem("modules.image.sizes", DEFAULT_SIZES).filter(
    (size) => size < maxWidth
  );

  const format = await getImageFormat(imageNode, passedFormat);
  const mime = mimeTypes.lookup(format);

  log(`Creating src set: ${sizes.length} sizes`);
  const images = await promiseRunner(sizes, async (size, idx, arr) => {
    return saveImage(imageNode.resize(size), format);
  });

  return {
    srcset: images.map(
      ({ relativeFile }, idx) => `${relativeFile} ${sizes[idx]}w`
    ),
    type: mime,
    sizes: [
      ...sizes.map((size) => `(max-width: ${size}px) 100vw`),
      "100vw",
    ].join(", "),
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
    };
  }

  const distImages = getConfigItem("dist.images");

  const rootImageNode = getConfigItem("dev") ? sharpURL(file) : sharp(file);
  const { width, height, format } = await rootImageNode.metadata();
  const { dominant } = await rootImageNode.stats();

  await ensureDir(distImages);

  log(
    `Creating fallback at size ${getConfigItem(
      "modules.image.fallbackSize",
      DEFAULT_FALLBACK_SIZE
    )}`
  );
  const { relativeFile: fallback } = await saveImage(
    rootImageNode.resize(
      getConfigItem("modules.image.fallbackSize", DEFAULT_FALLBACK_SIZE)
    )
  );

  const sources = await Promise.all([
    createSrcSet(rootImageNode.webp(), width, "webp"),
    format !== "webp"
      ? createSrcSet(rootImageNode, width)
      : Promise.resolve(false),
  ]);

  const placeholders = await Promise.all([
    createSrcSet(
      rootImageNode
        .resize(
          getConfigItem(
            "modules.image.placeholder.size",
            DEFAULT_PLACEHOLDER_SIZE
          )
        )
        .webp({
          quality: getConfigItem(
            "modules.image.placeholder.quality",
            DEFAULT_PLACEHOLDER_QUALITY
          ),
        }),
      width,
      "webp"
    ),
    format !== "webp"
      ? createSrcSet(
          rootImageNode
            .resize(
              getConfigItem(
                "modules.image.placeholder.size",
                DEFAULT_PLACEHOLDER_SIZE
              )
            )
            .toFormat(format, {
              quality: getConfigItem(
                "modules.image.placeholder.quality",
                DEFAULT_PLACEHOLDER_QUALITY
              ),
            }),
          width
        )
      : Promise.resolve(false),
  ]);

  return {
    fallback,
    sources,
    placeholders,
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
  publicPath: "/assets",

  publicFilePath: (file) => {
    const distImagesFolder = getConfigItem("dist.images");

    return file.startsWith(distImagesFolder)
      ? file.replace(
          distImagesFolder,
          getConfigItem("modules.image.publicPath")
        )
      : file;
  },

  fallbackSize: DEFAULT_FALLBACK_SIZE,

  sizes: DEFAULT_SIZES,

  placeholder: {
    size: DEFAULT_PLACEHOLDER_SIZE,
    quality: DEFAULT_PLACEHOLDER_QUALITY,
  },

  server: {
    endpoint: DEFAULT_API_ENDPOINT,
  },
};

{
  /* <picture>
  <source
    srcset="/_nuxt/image/6f79034f4c5cfb5ea12abc687a82a3bb.webp 320w, /_nuxt/image/79469289589e2b1a5e6e2f0506e3b304.webp 640w, /_nuxt/image/26c98947fcc1f13df6d201647d7d2220.webp 768w, /_nuxt/image/5c3af8a0fb33ebc3349d42e0513339fb.webp 1024w, /_nuxt/image/bb897d1c21605629cbc0a90285ca87c2.webp 1280w, /_nuxt/image/b82d2f229b637e20d35a68f3fbff0f54.webp 2400w"
    sizes="(max-width: 320px) 100vw, (max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 100vw, (max-width: 1280px) 100vw, 100vw"
    type="image/webp">

  <source srcset="/_nuxt/image/2dfa72ec04a1e5609303277b6d3c9e35.webp 320w, /_nuxt/image/7f9dfa76b50602725547204e2e6aab48.webp 640w, /_nuxt/image/dcf4188a6fba4fc6e49dda34b0c0ecab.webp 768w, /_nuxt/image/52f929f963717d0a0a5df5cf07d92da9.webp 1024w, /_nuxt/image/6dac176505bfa80e96b6caa44f41a033.webp 1280w, /_nuxt/image/0e98e3323a84e4df88fbdf00b5a5188a.webp 2400w" sizes="(max-width: 320px) 100vw, (max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 100vw, (max-width: 1280px) 100vw, 100vw" type="image/webp">
  <img src="/_nuxt/image/03b4b2e0eb4c55d318f5a9001d3724a0.png" alt="">
</picture> */
}
