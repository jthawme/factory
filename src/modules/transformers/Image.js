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
 * @property {ImageObjectSource[]} sources
 * @property {ImageObjectSource[]} placeholders
 * @property {number} width
 * @property {number} height
 * @property {number} aspectRatio
 */

// This pattern makes sure we are matching just this enclosed word, with spaces or start/end of line
const enclosedPattern = (word, flags = "gim") =>
  new RegExp(`(?<=(?:\\s|^))(${word})`, flags);

// Valid image matcher
const imagePattern = /(.jpg|.png|.jpeg|.webp)$/;

// This looks for an image like word
const inlinePattern = /(?<=(?:\s|^))([a-z0-9-_/]+(?:.jpg|.png|.jpeg|.webp))/;

// This matches a markdown pattern for an image
const markdownPattern =
  /!\[.*\]\((?:\s)*([a-z0-9-_\/]+.(?:jpg|png|jpeg|webp)).*\)/;

// This captures the different regions of a markdown image
const deconstructMarkdown =
  /!\[(.*)\]\((?:\s)*([a-z0-9-_\/]+.(?:jpg|png|jpeg|webp))\s*(?:"(.*?)")?\)/;

const getImageFormat = async (imageNode, passedFormat) => {
  if (passedFormat) {
    return Promise.resolve(passedFormat);
  }

  const { format } = await imageNode.metadata();

  return format;
};

/**
 * Takes a sharp node, creates a hash of it and saves it out
 *
 * @param {sharp.Sharp} imageNode
 * @param {string} [passedFormat]
 * @returns {{
 *  file: string,
 *  absoluteFile: string,
 *  relativeFile: string,
 * }}
 */
const saveImage = async (imageNode, passedFormat) => {
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
 * @returns {ImageError | ImageObject}
 */
export const transformImage = async (imagePath) => {
  const file = await findFile(imagePath);

  if (!file || !imagePattern.test(file)) {
    return {
      exists: false,
    };
  }

  const isDev = getConfigItem("dev");
  const distImages = getConfigItem("dist.images");

  const rootImageNode = sharp(file);
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
  };
};

const convertImage = async (markdownImage) => {
  const [_, alt, imagePath, title] = deconstructMarkdown.exec(markdownImage);

  const image = await transformImage(imagePath);

  const imageData = {
    alt,
    ...image,
  };

  return `![${JSON.stringify(imageData)}](${imagePath}${
    title ? ` "${title}"` : ""
  })`;
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
        new RegExp(`${inlinePattern.source}|${markdownPattern.source}`, "gim")
      ),
    ];

    if (images.length) {
      let text = value;

      const converted = await promiseRunner(images, async ([image], idx) => {
        // const r = enclosedPattern(image);
        text = text.replace(image, createMarker(idx));

        if (new RegExp(inlinePattern, "i").test(image)) {
          return convertImage(`![](${image})`);
        } else {
          return convertImage(image);
        }
      });

      converted.forEach((image, idx) => {
        text = text.replace(createMarker(idx), image);
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
