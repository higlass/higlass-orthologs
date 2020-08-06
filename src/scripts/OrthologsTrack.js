import { scaleLinear } from "d3-scale";
import { color } from "d3-color";

import EnsemblHelper from "./EnsemblHelper";

const OrthologsTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"'
    );
  }

  // Services
  const { tileProxy } = HGC.services;

  // Utils
  const { colorToHex, trackUtils, absToChr } = HGC.utils;

  const WHITE_HEX = colorToHex("#ffffff");
  const DARKGREY_HEX = colorToHex("#999999");

  class OrthologsTrackClass extends HGC.tracks.HorizontalGeneAnnotationsTrack {
    constructor(context, options) {
      super(context, options);

      const { animate } = context;

      this.trackId = this.id;

      this.animate = animate;

      this.options = options;
      this.initOptions();

      this.ensemblHelper = new EnsemblHelper();
      this.labels = this.ensemblHelper.initializeLabelTexts(
        this.labelTextOptions,
        HGC.libraries.PIXI
      );

      this.aminoAcidTexts = this.ensemblHelper.initializeAminoAcidTexts(
        this.aaTextOptions,
        HGC.libraries.PIXI
      );

      this.aminoAcidTextsNoMatch = this.ensemblHelper.initializeAminoAcidTexts(
        this.aaTextOptionsNoMatch,
        HGC.libraries.PIXI
      );

      this.updateActiveSpecies();
    }

    initTile(tile) {
      // create texts
      tile.texts = {};
      tile.textWidths = {};
      tile.textHeights = {};

      tile.rectGraphics = new HGC.libraries.PIXI.Graphics();
      tile.rectMaskGraphics = new HGC.libraries.PIXI.Graphics();
      tile.aminoAcidTextGraphics = new HGC.libraries.PIXI.Graphics();

      tile.graphics.addChild(tile.rectGraphics);
      tile.graphics.addChild(tile.rectMaskGraphics);
      tile.graphics.addChild(tile.aminoAcidTextGraphics);

      tile.rectGraphics.mask = tile.rectMaskGraphics;

      if (!tile.tileData.sort) return;

      tile.tileData.sort((a, b) => b.importance - a.importance);

      tile.tileData.forEach((td, i) => {
        const ts = td.fields;
        const tsFormatted = this.formatTranscriptData(ts);
        //const transcriptName = tsFormatted.transcriptName;
        const transcriptId = tsFormatted.transcriptId;

        td["transcriptId"] = transcriptId;
      });

      tile.humanAminoAcids = [];
      tile.sequenceData = {};

      // This keeps track of when a rerender is necessary when we switch from AA view to condensed view
      tile.isRerenderNecessary = false;

      tile.initialized = true;

      this.rerender(this.options, true);
    }

    initOptions() {
      this.fontSize = +this.options.fontSize;
      this.rowHeight = +this.options.rowHeight;
      this.rowSpacing = +this.options.rowSpacing;

      // controls when the abbreviated codon rectangles are displayed
      this.minCodonDistance = 3;

      this.colors = {};
      this.colors["labelTextColor"] = colorToHex(this.options.labelTextColor);
      this.colors["black"] = colorToHex("#000000");
      this.colors["white"] = colorToHex("#ffffff");
      this.colors["lightgrey"] = colorToHex("#ededed");
      this.colors["+1"] = colorToHex(this.options.plusStrandColor1);
      this.colors["+2"] = colorToHex(this.options.plusStrandColor2);
      this.colors["+dark"] = colorToHex(this.options.plusStrandColorDark);
      this.colors["-1"] = colorToHex(this.options.minusStrandColor1);
      this.colors["-2"] = colorToHex(this.options.minusStrandColor2);
      this.colors["-dark"] = colorToHex(this.options.minusStrandColorDark);
      this.colors["aaColor"] = colorToHex(this.options.aminoAcidColor);
      this.colors["aaColorNoMatch"] = colorToHex(
        this.options.aminoAcidColorNoMatch
      );

      this.labelTextOptions = {
        fontSize: `${this.fontSize * 2}px`,
        fontFamily: this.options.fontFamily,
        fill: this.colors["labelTextColor"],
        fontWeight: "bold",
      };

      this.aaTextOptions = {
        fontSize: `${this.fontSize * 2}px`,
        fontFamily: this.options.fontFamily,
        fill: this.colors["aaColor"],
      };

      this.aaTextOptionsNoMatch = {
        fontSize: `${this.fontSize * 2}px`,
        fontFamily: this.options.fontFamily,
        fill: this.colors["aaColorNoMatch"],
      };
    }

    updateActiveSpecies() {
      const species = this.options.species;
      this.activeSpecies = [];

      species.forEach((sp, i) => {
        // only procedd if species is supported
        if (this.labels[sp]) {
          const as = {};
          as["label"] = this.labels[sp];
          as["species"] = sp;
          as["yPosOffset"] = i * (this.rowHeight + this.rowSpacing);
          this.activeSpecies.push(as);
        }
      });
      //console.log("ActiveSpecies", this.activeSpecies);
    }

    formatTranscriptData(ts) {
      const strand = ts[5];
      // const stopCodonPos =
      //   ts[12] === "." ? "." : strand === "+" ? +ts[12] + 2 : +ts[12] - 1;
      const stopCodonPos =
        ts[12] === "." ? "." : strand === "+" ? +ts[12] - 1 : +ts[12] + 2;
      const startCodonPos =
        ts[11] === "." ? "." : strand === "+" ? +ts[11] - 1 : +ts[11] + 2;
      const exonStarts = ts[9].split(",").map((x) => +x - 1);
      const exonEnds = ts[10].split(",").map((x) => +x);
      const txStart = +ts[1] - 1;
      const txEnd = +ts[2];

      const result = {
        transcriptId: this.transcriptId(ts),
        geneIdEnsemble: ts[6].split(".")[0],
        transcriptName: ts[3],
        txStart: txStart,
        txEnd: txEnd,
        strand: strand,
        chromName: ts[0],
        codingType: ts[8],
        exonStarts: exonStarts,
        exonEnds: exonEnds,
        startCodonPos: startCodonPos,
        stopCodonPos: stopCodonPos,
        importance: +ts[4],
      };
      return result;
    }

    transcriptId(transcriptInfo) {
      return `${transcriptInfo[7]}_${transcriptInfo[0]}_${transcriptInfo[1]}_${transcriptInfo[2]}`;
    }

    drawTile() {}

    updateTranscriptInfo() {
      console.log("updateTranscriptInfo");
      // get all visible transcripts
      const visibleTranscriptsObj = {};
      const chrOffsets = {};

      this.visibleAndFetchedTiles().forEach((tile) => {
        tile.tileData.forEach((ts) => {
          visibleTranscriptsObj[ts.transcriptId] = ts.fields;
          chrOffsets[ts.transcriptId] = +ts.chrOffset;
        });
      });

      const visibleTranscripts = [];
      for (const tsId in visibleTranscriptsObj) {
        visibleTranscripts.push(visibleTranscriptsObj[tsId]);
      }

      console.log(visibleTranscripts);

      this.transcriptInfo = {};
      const seqDataPromises = [];

      visibleTranscripts
        // .sort(function (a, b) {
        //   return +a[1] - b[1];
        // })
        .forEach((ts) => {
          const tsFormatted = this.formatTranscriptData(ts);
          const chrOffset = chrOffsets[tsFormatted.transcriptId];

          const codonStartsAndLengths = this.calculateCodonPositions(
            tsFormatted,
            chrOffset
          );

          const tInfo = {
            transcriptId: tsFormatted.transcriptId,
            transcriptName: tsFormatted.transcriptName,
            txStart: tsFormatted.txStart,
            txEnd: tsFormatted.txEnd,
            strand: tsFormatted.strand,
            chromName: tsFormatted.chromName,
            codingType: tsFormatted.codingType,
            exonStarts: tsFormatted.exonStarts,
            exonEnds: tsFormatted.exonEnds,
            startCodonPos: tsFormatted.startCodonPos,
            stopCodonPos: tsFormatted.stopCodonPos,
            importance: tsFormatted.importance,
            sequenceData: null,
            codonStartsAndLengths: codonStartsAndLengths,
            showTranscript: true, // if transcripts overlap, this is used to hide one of them
          };

          this.transcriptInfo[tInfo.transcriptId] = tInfo;

          if (this.zoomLevel >= this.maxZoom - 2) {
            const speciesArr = this.activeSpecies.map((s) => s.species);

            const seqDataPromise = this.ensemblHelper.getSeqData(
              tsFormatted.geneIdEnsemble,
              tInfo.transcriptId,
              speciesArr
            );
            seqDataPromises.push(seqDataPromise);
          }
        });

      // Once all the data is there, assign it to the transcriptInfo and rerender
      Promise.all(seqDataPromises).then((results) => {
        // results is an array of seq data from Ensemble
        if (results.length === 0) return;

        results.forEach((res) => {
          const transcriptId = res.transcriptId;
          const data = res.speciesSeqData;
          //const txStart = this.transcriptInfo[transcriptId].txStart;
          //const txEnd = this.transcriptInfo[transcriptId].txEnd;
          this.transcriptInfo[transcriptId].sequenceData = data;

          // if(Object.keys(data).length === 0){
          //   this.transcriptInfo[transcriptId].showTranscript = false;
          //   return;
          // }

          // Not very efficient, but we most likely we don't have more than 3 results anyway
          // This hides transcripts that overlap (keeps the one with more data in Ensembl.
          // Commented for now, since this should be done in the data preparation step.
          // for (var i = 0; i < results.length; i++) {
          //   if (results[i].transcriptId === transcriptId) {
          //     continue;
          //   }
          //   const transcriptId2 = results[i].transcriptId;
          //   const txStart2 = this.transcriptInfo[transcriptId2].txStart;
          //   const txEnd2 = this.transcriptInfo[transcriptId2].txEnd;
          //   const data2 = results[i].speciesSeqData;
          //   const doTranscriptsOverlap =
          //     (txStart2 < txEnd && txStart2 > txStart) ||
          //     (txEnd2 > txStart && txEnd2 < txEnd);

          //   if (
          //     doTranscriptsOverlap &&
          //     Object.keys(data).length < Object.keys(data2).length
          //   ) {
          //     this.transcriptInfo[transcriptId].showTranscript = false;
          //   }
          // }
          // console.log(data);
        });

        this.assignSequenceDataToTiles();
        this.visibleAndFetchedTiles().forEach((tile) => {
          this.renderTile(tile);
        });
        this.draw();
      });
    }

    assignSequenceDataToTiles() {
      this.visibleAndFetchedTiles().forEach((tile) => {
        // If we assigned it already, don't do it again.
        if (!tile.initialized || Object.keys(tile.sequenceData).length > 0) {
          return;
        }

        const [tileMinX, tileMaxX] = this.getBoundsOfTile(tile);

        const transcripts = tile.tileData;
        const visibleTranscripts = [];

        transcripts.forEach((transcript) => {
          const transcriptInfo = transcript.fields;
          visibleTranscripts.push(this.transcriptId(transcriptInfo));
        });
        //const visibleTranscripts = Object.keys(this.transcriptInfo);

        tile.sequenceData = {};

        // Initialize
        this.activeSpecies.forEach((as) => {
          tile.sequenceData[as.species] = [];
        });

        visibleTranscripts.forEach((transcriptId) => {
          const tInfo = this.transcriptInfo[transcriptId];
          const seqData = tInfo.sequenceData;

          if (!seqData) return;

          if (!this.transcriptInfo[transcriptId]["showTranscript"]) return;

          // The offset it important for AAs across tiles. They need to overlap.
          const visibleCodonStartsAndLengths = tInfo.codonStartsAndLengths.filter(
            (c) => c[0] >= tileMinX - 2 && c[0] <= tileMaxX
          );

          Object.keys(tile.sequenceData).forEach((species) => {
            // if no ensembl data is available, add dummy data, that leads to a grey bar
            if (!seqData[species]) {
              visibleCodonStartsAndLengths.forEach((cs) => {
                tile.sequenceData[species].push({
                  start: cs[0], // abs coords
                  codonLength: cs[1],
                  letterWidth: 0,
                  letterHeight: 0,
                  sprite: null,
                  match: false,
                  strand: null,
                  backgroundColor: this.colors["lightgrey"],
                });
              });
              return;
            }

            const seq = seqData[species].seq;

            visibleCodonStartsAndLengths.forEach((cs) => {
              if (!seq[cs[2]]) {
                return;
              }
              const letter = seq[cs[2]].aa;
              const doesMatchWithHuman = seq[cs[2]].match;

              if (this.aminoAcidTexts[letter]) {
                const aaText = doesMatchWithHuman
                  ? this.aminoAcidTexts[letter]
                  : this.aminoAcidTextsNoMatch[letter];

                const backgroundColor =
                  cs[2] % 2 === 0
                    ? this.colors[tInfo.strand + "2"]
                    : this.colors[tInfo.strand + "1"];

                const pixiSprite = new HGC.libraries.PIXI.Sprite(
                  aaText.texture
                );
                pixiSprite.width = aaText.width;
                pixiSprite.height = aaText.height;

                pixiSprite.position.x = 0; //needs to be adjusted n the draw method
                pixiSprite.position.y = 0;

                tile.sequenceData[species].push({
                  start: cs[0], // abs coords
                  codonLength: cs[1],
                  letterWidth: aaText.width,
                  letterHeight: aaText.height,
                  sprite: pixiSprite,
                  match: doesMatchWithHuman,
                  strand: tInfo.strand,
                  backgroundColor: backgroundColor,
                });
              }
            });
          });
        });
      });
    }

    calculateCodonPositions(ts, chrOffset) {
      if (this.zoomLevel < this.maxZoom - 2) {
        return [];
      }

      const exonStarts = ts["exonStarts"];
      const exonEnds = ts["exonEnds"];
      const strand = ts["strand"];
      const codonStartsAndLengths = [];

      const isProteinCoding =
        ts["startCodonPos"] !== "." && ts["stopCodonPos"] !== ".";

      if (!isProteinCoding) {
        return [];
      }

      let startCodonPos = ts["startCodonPos"] + chrOffset;
      let stopCodonPos = ts["stopCodonPos"] + chrOffset;

      let exonOffsetStarts = exonStarts.map((x) => +x + chrOffset);
      let exonOffsetEnds = exonEnds.map((x) => +x + chrOffset);

      // Add start and stop codon to the exon list and distingush between UTR and coding region later
      exonOffsetStarts.push(startCodonPos, stopCodonPos);
      exonOffsetEnds.push(startCodonPos, stopCodonPos);

      exonOffsetStarts.sort((a, b) => +a - b);
      exonOffsetEnds.sort((a, b) => +a - b);

      // For the minus strand we reverse the order, so that the alorithm works in the same way.
      if (strand === "-") {
        startCodonPos = -1 * startCodonPos;
        stopCodonPos = -1 * stopCodonPos;
        const exonOffsetStartsCopy = [...exonOffsetStarts];
        const exonOffsetEndsCopy = [...exonOffsetEnds];
        exonOffsetStarts = exonOffsetEndsCopy.map((s) => -1 * s);
        exonOffsetEnds = exonOffsetStartsCopy.map((s) => -1 * s);
        exonOffsetStarts.sort((a, b) => +a - b);
        exonOffsetEnds.sort((a, b) => +a - b);
      }

      // We want to assign each codon the correct position in the genome. Since
      // they can be split between exons, we have to keep track how they are psoitioned
      // across exons
      let codonLengthCorrection = 0;
      let nextCodonLength = 3;
      // We assume that we have an array with AAs that we need to assign to these gene coordinates.
      // Since they can appear twice, we have to keep track when this happens
      let codonId = 0;

      for (let j = 0; j < exonOffsetStarts.length; j++) {
        const exonStart = exonOffsetStarts[j];
        const exonEnd = exonOffsetEnds[j];

        const isUtr = exonEnd <= startCodonPos || exonStart >= stopCodonPos;

        if (isUtr) {
          continue;
        }

        for (let k = exonStart; k < exonEnd; k = k + nextCodonLength) {
          const codonStart = k;

          let codonStartAndLength = null;

          if (codonLengthCorrection !== 0) {
            nextCodonLength = codonLengthCorrection;
            codonLengthCorrection = 0;
            codonStartAndLength = [codonStart, nextCodonLength, codonId];
            codonId += 1;
          } else if (codonStart + nextCodonLength > exonEnd) {
            nextCodonLength = exonEnd - codonStart;
            codonLengthCorrection = 3 - nextCodonLength;
            codonStartAndLength = [codonStart, exonEnd - codonStart, codonId];
            //nextCodonLength = codonLengthCorrection;
          } else {
            nextCodonLength = 3;
            codonLengthCorrection = 0;
            codonStartAndLength = [codonStart, nextCodonLength, codonId];
            codonId += 1;
          }

          codonStartsAndLengths.push(codonStartAndLength);
        }
      }

      if (strand === "-") {
        // we have to reverse the order again and shift the start position
        const numCodons = codonStartsAndLengths.length;
        const adjustedStartsAndLengths = codonStartsAndLengths.map((sl) => [
          -1 * sl[0] - sl[1],
          sl[1],
          sl[2],
        ]);
        //console.log(adjustedStartsAndLengths);
        return adjustedStartsAndLengths;
      }

      return codonStartsAndLengths;
    }

    /*
     * Redraw the track because the options
     * changed
     */
    rerender(options, force) {
      //console.log("rerender");
      const strOptions = JSON.stringify(options);
      if (!force && strOptions === this.prevOptions) return;

      this.options = options;
      this.initOptions();

      this.prevOptions = strOptions;

      this.updateTranscriptInfo();

      this.drawLabels();

      this.visibleAndFetchedTiles().forEach((tile) => {
        this.renderTile(tile);
      });
    }

    renderMask(tile) {
      const { tileX, tileWidth } = trackUtils.getTilePosAndDimensions(
        this.tilesetInfo,
        tile.tileId
      );

      tile.rectMaskGraphics.clear();

      const randomColor = Math.floor(Math.random() * 16 ** 6);
      tile.rectMaskGraphics.beginFill(randomColor, 0.3);

      const x = this._xScale(tileX);
      const y = 0;
      const width = this._xScale(tileX + tileWidth) - this._xScale(tileX);
      const height = this.dimensions[1];
      tile.rectMaskGraphics.drawRect(x, y, width, height);
    }

    renderTile(tile) {
      if (!tile.initialized) return;

      // store the scale at while the tile was drawn at so that
      // we only resize it when redrawing
      tile.drawnAtScale = this._xScale.copy();
      tile.rectGraphics.removeChildren();
      tile.rectGraphics.clear();

      const codonWidth = this._xScale(3) - this._xScale(0);

      if (Object.keys(tile.sequenceData).length === 0) {
        this.renderExons(tile);
      } else if (codonWidth < this.fontSize) {
        this.renderCondensedView(tile);
      }

      this.renderMask(tile);

      trackUtils.stretchRects(this, [
        (x) => x.rectGraphics,
        (x) => x.rectMaskGraphics,
      ]);
    }

    draw() {
      trackUtils.stretchRects(this, [
        (x) => x.rectGraphics,
        (x) => x.rectMaskGraphics,
      ]);

      this.visibleAndFetchedTiles().forEach((tile) => {
        this.drawAminoAcids(tile);
      });

      // otherwise codons are not displayed on startup
      requestAnimationFrame(this.animate);
    }

    drawAminoAcids(tile) {
      if (!this.transcriptInfo || !tile || !tile.initialized) return;

      // If there is no seq data, don't draw. This will prevent drawing on lower zoom levels
      if (Object.keys(tile.sequenceData).length === 0) return;

      tile.aminoAcidTextGraphics.clear();
      tile.aminoAcidTextGraphics.removeChildren();

      const codonWidth = this._xScale(3) - this._xScale(0);
      if (codonWidth < this.fontSize && tile.isRerenderNecessary) {
        this.renderTile(tile);
        tile.isRerenderNecessary = false;
        return;
      } else if (codonWidth < this.fontSize) {
        return;
      } else {
        tile.isRerenderNecessary = true;
      }

      const graphics = tile.aminoAcidTextGraphics;

      const [tileMinX, tileMaxX] = this.getBoundsOfTile(tile);
      const minX = this._xScale.invert(0);
      const maxX = this._xScale.invert(this.dimensions[0]);

      this.activeSpecies.forEach((as) => {
        const yOffset = as.yPosOffset;
        const species = as.species;

        const totalRowHeight = this.rowHeight + this.rowSpacing;
        const yMiddle = yOffset + totalRowHeight / 2;

        tile.sequenceData[species].forEach((aa) => {
          if (
            // the -2 means we load also the adjacent entries from the neigbor tile,
            // otherwise there might be gaps across tiles
            aa.start >= Math.max(minX, tileMinX - 2) &&
            aa.start <= Math.min(maxX, tileMaxX)
          ) {
            const xMiddle = this._xScale(aa.start + aa.codonLength / 2);
            graphics.beginFill(aa.backgroundColor);
            const width = (codonWidth * aa.codonLength) / 3;
            graphics.drawRect(
              this._xScale(aa.start),
              yOffset,
              width,
              totalRowHeight
            );

            if (aa.sprite) {
              // This is null when there is not data from Ensembl
              aa.sprite.position.x = xMiddle - aa.letterWidth / 2;
              aa.sprite.position.y = yMiddle - aa.letterHeight / 2;
              graphics.addChild(aa.sprite);
            }
          }
        });
      });
    }

    // This renders the transcript only
    renderExons(tile) {
      const [tileMinX, tileMaxX] = this.getBoundsOfTile(tile);
      const transcripts = tile.tileData;

      transcripts.forEach((transcript) => {
        const transcriptInfo = transcript.fields;
        const chrOffset = +transcript.chrOffset;

        const transcriptId = this.transcriptId(transcriptInfo);

        if (!this.transcriptInfo[transcriptId]["showTranscript"]) return;

        const exonStarts = this.transcriptInfo[transcriptId]["exonStarts"];
        const exonEnds = this.transcriptInfo[transcriptId]["exonEnds"];

        const strand = this.transcriptInfo[transcriptId]["strand"];

        const isProteinCoding =
          this.transcriptInfo[transcriptId]["startCodonPos"] !== "." &&
          this.transcriptInfo[transcriptId]["stopCodonPos"] !== ".";

        if (!isProteinCoding) {
          return;
        }

        const startCodonPos =
          this.transcriptInfo[transcriptId]["startCodonPos"] + chrOffset;
        const stopCodonPos =
          this.transcriptInfo[transcriptId]["stopCodonPos"] + chrOffset;

        const txStart =
          this.transcriptInfo[transcriptId]["txStart"] + chrOffset;
        const txEnd = this.transcriptInfo[transcriptId]["txEnd"] + chrOffset;

        let exonOffsetStarts = exonStarts.map((x) => +x + chrOffset);
        let exonOffsetEnds = exonEnds.map((x) => +x + chrOffset);

        // Add start and stop codon to the exon list and distingush between UTR and coding region later
        exonOffsetStarts.push(startCodonPos, stopCodonPos);
        exonOffsetEnds.push(startCodonPos, stopCodonPos);

        exonOffsetStarts.sort();
        exonOffsetEnds.sort();

        const xStartPos = this._xScale(txStart);
        const xEndPos = this._xScale(txEnd);

        const rectHeight =
          this.activeSpecies.length * (this.rowHeight + this.rowSpacing);

        const exonRects = [];

        // draw the actual exons
        for (let j = 0; j < exonOffsetStarts.length; j++) {
          const exonStart = exonOffsetStarts[j];
          const exonEnd = exonOffsetEnds[j];

          // if the exon has no overlap with the tile, go on
          if (exonEnd < tileMinX || exonStart > tileMaxX) continue;

          const isUtr =
            (strand === "+" &&
              (exonEnd <= startCodonPos || exonStart >= stopCodonPos)) ||
            (strand === "-" &&
              (exonStart >= startCodonPos || exonEnd <= stopCodonPos));

          if (isUtr) continue;

          const xStart = this._xScale(exonStart);
          const localWidth = Math.max(
            1,
            this._xScale(exonEnd) - this._xScale(exonStart)
          );

          const rectStartX =
            strand === "+"
              ? Math.min(xStart, xEndPos)
              : Math.max(xStart, xStartPos);
          const rectEndX =
            strand === "+"
              ? Math.min(xStart + localWidth, xEndPos)
              : Math.max(xStart + localWidth, xStartPos);

          exonRects.push([rectStartX, 0, rectEndX - rectStartX, rectHeight]);
        }

        // Draw Everything
        const color1 = this.colors[strand + "1"];
        tile.rectGraphics.beginFill(color1);
        for (var i = 0, len = exonRects.length; i < len; i++) {
          tile.rectGraphics.drawRect(...exonRects[i]);
        }
      });
    }

    renderCondensedView(tile) {
      const [tileMinX, tileMaxX] = this.getBoundsOfTile(tile);
      const minX = this._xScale.invert(-this.dimensions[0]);
      const maxX = this._xScale.invert(2 * this.dimensions[0]);

      const codonWidth = this._xScale(3) - this._xScale(0);
      const transcripts = tile.tileData;

      transcripts.forEach((transcript) => {
        const transcriptInfo = transcript.fields;
        const transcriptId = this.transcriptId(transcriptInfo);

        //console.log(transcriptId)
        //console.log(tile.sequenceData)
        //if(!this.transcriptInfo[transcriptId]) return;
        if (!this.transcriptInfo[transcriptId]["showTranscript"]) return;

        const isProteinCoding =
          this.transcriptInfo[transcriptId]["startCodonPos"] !== "." &&
          this.transcriptInfo[transcriptId]["stopCodonPos"] !== ".";

        if (!isProteinCoding) {
          return;
        }

        this.activeSpecies.forEach((as) => {
          const yOffset = as.yPosOffset;
          const species = as.species;
          const totalRowHeight = this.rowHeight + this.rowSpacing;

          tile.sequenceData[species].forEach((aa) => {
            if (
              // the -2 means we load also the adjacent entries from the neigbor tile,
              // otherwise there might be gaps across tiles
              aa.start >= Math.max(minX, tileMinX - 2) &&
              aa.start <= Math.min(maxX, tileMaxX)
            ) {
              let colorUsed = this.colors["white"];
              if (aa.match && aa.strand === "+") {
                colorUsed = this.colors["+dark"];
              } else if (aa.match && aa.strand === "-") {
                colorUsed = this.colors["-dark"];
              } else if (aa.sprite === null) {
                // no data available
                colorUsed = this.colors["lightgrey"];
              }

              tile.rectGraphics.beginFill(colorUsed);
              const width = (codonWidth * aa.codonLength) / 3;
              tile.rectGraphics.drawRect(
                this._xScale(aa.start),
                yOffset,
                width,
                totalRowHeight
              );
            }
          });
        });
      });
    }

    drawLabels() {
      this.pForeground.clear();
      this.pForeground.removeChildren();
      let maxLabelWidth = 0;

      this.activeSpecies.forEach((sp) => {
        maxLabelWidth = Math.max(maxLabelWidth, sp.label.width);
      });

      this.pForeground.beginFill(WHITE_HEX);
      this.pForeground.drawRect(
        0,
        0,
        maxLabelWidth + 2,
        this.activeSpecies.length * (this.rowHeight + this.rowSpacing)
      );

      this.activeSpecies.forEach((sp, i) => {
        const sprite = sp.label.sprite;
        sprite.position.x = 0;
        sprite.position.y =
          sp.yPosOffset +
          (this.rowHeight + this.rowSpacing - sprite.height) / 2;

        this.pForeground.addChild(sprite);

        this.pForeground.drawRect(
          0,
          (i + 1) * (this.rowHeight + this.rowSpacing),
          this.dimensions[0],
          1
        );
      });
    }

    /** cleanup */
    destroyTile(tile) {
      tile.rectGraphics.destroy();
      tile.rectMaskGraphics.destroy();
      tile.aminoAcidTextGraphics.removeChildren();
      tile.aminoAcidTextGraphics.destroy();
      tile.graphics.destroy();
      tile = null;
    }

    calculateZoomLevel() {
      // offset by 2 because 1D tiles are more dense than 2D tiles
      // 1024 points per tile vs 256 for 2D tiles

      const xZoomLevel = tileProxy.calculateZoomLevel(
        this._xScale,
        this.tilesetInfo.min_pos[0],
        this.tilesetInfo.max_pos[0]
      );

      let zoomLevel = Math.min(xZoomLevel, this.maxZoom);
      zoomLevel = Math.max(zoomLevel, 0);

      return zoomLevel;
    }

    getBoundsOfTile(tile) {
      // get the bounds of the tile
      const tileId = +tile.tileId.split(".")[1];
      const zoomLevel = +tile.tileId.split(".")[0]; //track.zoomLevel does not always seem to be up to date
      const tileWidth = +this.tilesetInfo.max_width / 2 ** zoomLevel;
      const tileMinX = this.tilesetInfo.min_pos[0] + tileId * tileWidth; // abs coordinates
      const tileMaxX = this.tilesetInfo.min_pos[0] + (tileId + 1) * tileWidth;
      return [tileMinX, tileMaxX];
    }

    getMouseOverHtml(trackX, trackY) {
      return "";
    }
  }
  return new OrthologsTrackClass(...args);
};

const icon =
  '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M-1-1h22v22H-1z"/><g><path stroke="#007fff" stroke-width="1.5" fill="#007fff" d="M-.667-.091h5v20.167h-5z"/><path stroke-width="1.5" stroke="#e8e500" fill="#e8e500" d="M5.667.242h5v20.167h-5z"/><path stroke-width="1.5" stroke="#ff0038" fill="#ff0038" d="M15.833.076h5v20.167h-5z"/><path stroke="green" stroke-width="1.5" fill="green" d="M10.833-.258H14.5v20.167h-3.667z"/></g></svg>';

// default
OrthologsTrack.config = {
  type: "horizontal-orthologs",
  datatype: ["gene-annotation"],
  local: false,
  orientation: "1d-horizontal",
  thumbnail: new DOMParser().parseFromString(icon, "text/xml").documentElement,
  availableOptions: [
    "labelTextColor",
    "trackBorderColor",
    "backgroundColor",
    "fontSize",
    "fontFamily",
    "fontColor",
    "rowHeight",
    "rowSpacing",
    "species",
    "plusStrandColor1",
    "plusStrandColor2",
    "plusStrandColorDark",
    "minusStrandColor1",
    "minusStrandColor2",
    "minusStrandColorDark",
  ],
  defaultOptions: {
    labelTextColor: "#888888",
    aminoAcidColor: "#333333",
    aminoAcidColorNoMatch: "#b0b0b0",
    trackBorderColor: "white",
    backgroundColor: "white",
    fontSize: 10,
    fontFamily: "Arial",
    fontColor: "white",
    rowHeight: 11,
    rowSpacing: 2,
    species: [
      "human",
      "macaca_mulatta",
      "mouse",
      "dog",
      "elephant",
      "chicken",
      "zebrafish",
    ],
    plusStrandColor1: "#ebebff",
    plusStrandColor2: "#dedeff",
    plusStrandColorDark: "#bdbfff",
    minusStrandColor1: "#ffe0e2",
    minusStrandColor2: "#fff0f1",
    minusStrandColorDark: "#fabec2",
  },
};

export default OrthologsTrack;
