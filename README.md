# fluid-mechanics

Fluid Mechanics for Atmosphere and Ocean Scientists book.

The book originated as the lecture notes for the Fluid Mechanics course (OCE 575/675) taught at the Rosenstiel School.
It is mostly complete in scope but the content continues to improve.

Click on the cover to read:

<a href="https://fluidmechanics.app">
  <img src="assets/cover.png" alt="Open the book" width="600">
</a>

For the Fall 2026 course information, see [Syllabus](syllabus.md).

## Contributing

Feedback and contributions are welcome via Issues & PRs.

To build or run the book locally, first clone this repo (or your fork of this repo):

```
git clone https://github.com/wavesgroup/fluid-mechanics
cd fluid-mechanics/book
```
and install dependencies
```
npm i
```

To build the static website of the book locally, run:

```
npm run build
```
which will create the build in the `dist/` directory.

Alternatively, run a local development server:

```
npm run dev
```

and navigate to it at localhost:4321.

## Acknowledgements

Some figures are borrowed from Geoffrey Vallis's 2017 AOFD book and subject to his copyright.
All content in this repo is otherwise licensed under 
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Development of this book is supported by the National Science Foundation award
[2543464](https://www.nsf.gov/awardsearch/show-award?AWD_ID=2543464).