import { promiseRunner } from "../utils.js";

// This pattern makes sure we are matching just this enclosed word, with spaces or start/end of line
const enclosedPattern = (word, flags = "gim") =>
  new RegExp(`(?<=(?:\\s|^))(${word})`, flags);

// This looks for an image like word
const inlinePattern = /(?<=(?:\s|^))([a-z0-9-_/]+(?:.jpg|.png|.jpeg|.webp))/;

// This matches a markdown pattern for an image
const markdownPattern =
  /!\[.*\]\((?:\s)*([a-z0-9-_\/]+.(?:jpg|png|jpeg|webp)).*\)/;

// This captures the different regions of a markdown image
const deconstructMarkdown =
  /!\[(.*)\]\((?:\s)*([a-z0-9-_\/]+.(?:jpg|png|jpeg|webp))\s*(?:"(.*?)")?\)/;

const convertImage = (markdownImage) => {
  const [alt, imagePath, title] = deconstructMarkdown.exec(markdownImage);

  // TO DO CONVERT IMAGES INTO PICTURE ELEMENT SHIT

  return `![${alt}](${imagePath}${title ? ` "${title}"` : ""})`;
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

      await promiseRunner(images, async ([image]) => {
        const r = enclosedPattern(image);

        if (new RegExp(inlinePattern, "i").test(image)) {
          text = text.replace(r, convertImage(`![](${image})`));
        } else {
          text = text.replace(r, convertImage(image));
        }
      });

      return text;
    }

    return value;
  },
};
