# JT Factory

A module to convert static markdown files into a json consumable useful format. It should be able to handle static assets, doing usual expected frontend stuff like converting images to be responsive and hashing static assets

## Roadmap

- Load config file and also have very valid defaults ✅
- Transform .md files into json ✅
- Transform frontmatter in .md files into json ✅
- Find and transform image files into responsive picture element valid attributes ✅
- Extract colour points from image ✅
- Support property transform handling (to allow for things like relationship lookups) ✅
- Support a dev mode that spins up a server to serve IFS paths ✅
- Utility function to find all data files for route manifest ✅
- Caching for aiding image conversion ❌
- Marked plugin for decomposing image in markdown ❌
- An exported relational transform module, for running transforms on related markdown files ✅

### Further

- Video first frame module ❌
- Animated image module ❌

## Installation

[![https://nodei.co/npm/jt-factory.png?downloads=true&downloadRank=true&stars=true](https://nodei.co/npm/jt-factory.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/jt-factory)

```
npm i jt-factory
```

## Vite Plugin

This will let the images be served much quicker through the vite server, so you dont have to sit around for the images to be built

```
import { TransformServer } from 'jt-factory/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
    TransformServer()
  ]
});

```
