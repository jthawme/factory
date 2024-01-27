import express from "express";
import sharp from "sharp";
import { findFile } from "./modules/files.js";
import { getConfigItem } from "./config.js";

const init = (opts = {}) => {
  const app = express();

  app.get(
    `${getConfigItem("modules.image.server.endpoint", "/_image")}/*`,
    async (req, res) => {
      const file = await findFile(req.params[0]);

      try {
        let s = sharp(file);

        const { format } = await s.metadata();

        if (req.query.width) {
          s = s.resize(parseInt(req.query.width));
        }

        s.toFormat(req.query.format ?? format, {
          quality: parseInt(req.query.quality ?? "100"),
        })
          .toBuffer()
          .then(function (outputBuffer) {
            res.type(req.query.format || format);
            res.end(outputBuffer);
          });
      } catch (e) {
        console.error(e);

        res.status(404).json({
          error: true,
          file,
          message: "message" in e ?? "Error",
        });
      }
    }
  );

  return app;
};

export const TransformServer = (opts) => ({
  name: "transform-server",

  configureServer(server) {
    server.middlewares.use(init(opts));
  },
});
