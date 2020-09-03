import EnsemblHelper from "./EnsemblHelper";
import slugid from "slugid";

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

      this.gapTexts = this.ensemblHelper.initializeGapNumbers(
        this.gapTextOptions,
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
      tile.gapsGraphics = new HGC.libraries.PIXI.Graphics();

      tile.graphics.addChild(tile.rectGraphics);
      tile.graphics.addChild(tile.rectMaskGraphics);
      tile.graphics.addChild(tile.aminoAcidTextGraphics);
      tile.graphics.addChild(tile.gapsGraphics);

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

      tile.sequenceData = {};
      tile.gapsData = {};

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
      this.colors["+dark"] = colorToHex(this.options.plusStrandColorZoomedOut);
      this.colors["-1"] = colorToHex(this.options.minusStrandColor1);
      this.colors["-2"] = colorToHex(this.options.minusStrandColor2);
      this.colors["-dark"] = colorToHex(this.options.minusStrandColorZoomedOut);
      this.colors["gapsColor"] = colorToHex(this.options.gapsColor);
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

      this.gapTextOptions = {
        fontSize: `${this.fontSize * 2 - 2}px`,
        fontFamily: this.options.fontFamily,
        fill: this.colors["gapsColor"],
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
    }

    formatTranscriptData(ts) {
      const strand = ts[5];
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

      //console.log(visibleTranscripts);

      this.transcriptInfo = {};
      const seqDataPromises = [];

      visibleTranscripts.forEach((ts) => {
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

          if (this.transcriptInfo[transcriptId] === undefined) return;

          this.transcriptInfo[transcriptId].sequenceData = data;

          //const txStart = this.transcriptInfo[transcriptId].txStart;
          //const txEnd = this.transcriptInfo[transcriptId].txEnd;

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

        tile.sequenceData = {};
        tile.gapsData = {};

        // Initialize
        this.activeSpecies.forEach((as) => {
          tile.sequenceData[as.species] = [];
          tile.gapsData[as.species] = [];
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
                  letter: "", // used in svg export
                  sprite: null,
                  match: false,
                  strand: null,
                  backgroundColor: this.colors["lightgrey"],
                });
              });
              return;
            }

            const seq = seqData[species].seq;
            const gaps = seqData[species].gaps;

            visibleCodonStartsAndLengths.forEach((cs) => {
              //cs = [codonStart, codonLength, codonId]
              const codonStart = cs[0];
              const codonLength = cs[1];
              const codonId = cs[2];

              if (!seq[codonId]) {
                return;
              }

              // Add gaps data
              if (gaps[codonId] !== "") {
                const gapLength = gaps[codonId].length;
                const maxGap = this.gapTexts["maxGap"];

                const gapText =
                  gapLength > maxGap
                    ? this.gapTexts[">" + maxGap]
                    : this.gapTexts[gapLength];

                const pixiSprite = new HGC.libraries.PIXI.Sprite(
                  gapText.texture
                );
                pixiSprite.width = gapText.width;
                pixiSprite.height = gapText.height;

                tile.gapsData[species].push({
                  position: codonStart, // abs coords
                  seq: gaps[codonId],
                  gapLength: gapLength,
                  sprite: pixiSprite,
                  letterHeight: gapText.height,
                });
              }

              // Add seq data
              const letter = seq[codonId].aa;
              const doesMatchWithHuman = seq[codonId].match;

              if (this.aminoAcidTexts[letter]) {
                const aaText = doesMatchWithHuman
                  ? this.aminoAcidTexts[letter]
                  : this.aminoAcidTextsNoMatch[letter];

                let backgroundColor =
                  codonId % 2 === 0
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
                  start: codonStart, // abs coords
                  codonLength: codonLength,
                  letterWidth: aaText.width,
                  letterHeight: aaText.height,
                  letter: letter,
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
      // they can be split between exons, we have to keep track how they are positioned
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
        const adjustedStartsAndLengths = codonStartsAndLengths.map((sl) => [
          -1 * sl[0] - sl[1],
          sl[1],
          sl[2],
        ]);
        return adjustedStartsAndLengths;
      }

      return codonStartsAndLengths;
    }

    /*
     * Redraw the track because the options
     * changed
     */
    rerender(options, force) {
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

      const exonRects = this.getVisibleExonRects(tile);

      if (Object.keys(tile.sequenceData).length === 0) {
        this.renderExons(tile, exonRects);
      } else if (codonWidth < this.fontSize) {
        this.renderCondensedView(tile);
      }

      tile.allExonsForMouseOver = this.generateMouseOverRects(exonRects);
      tile.allGapsForMouseOver = [];

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
      tile.gapsGraphics.clear();
      tile.gapsGraphics.removeChildren();
      tile.allGapsForMouseOver = [];

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

      const gapsGraphics = tile.gapsGraphics;
      gapsGraphics.beginFill(this.colors["gapsColor"]);

      const [tileMinX, tileMaxX] = this.getBoundsOfTile(tile);
      const minX = this._xScale.invert(0);
      const maxX = this._xScale.invert(this.dimensions[0]);

      // the -3 means we load also the adjacent entries from the neigbour tile,
      // otherwise there might be gaps across tiles
      const visibleMinX = Math.max(minX, tileMinX) - 3;
      const visibleMaxX = Math.min(maxX, tileMaxX);

      const totalRowHeight = this.rowHeight + this.rowSpacing;

      this.activeSpecies.forEach((as) => {
        const yOffset = as.yPosOffset;
        const yMiddle = yOffset + totalRowHeight / 2;
        const species = as.species;

        tile.gapsData[species].forEach((gap) => {
          if (gap.position >= visibleMinX && gap.position <= visibleMaxX) {
            const drawX = this._xScale(gap.position + 1);
            gapsGraphics.drawRect(drawX - 1, yOffset, 2, totalRowHeight);

            // if there is enough space, show the gap numbers
            if (codonWidth > 2.2 * this.gapTexts["maxWidth"]) {
              gap.sprite.position.x = drawX + 3;
              gap.sprite.position.y = yMiddle - gap.letterHeight / 2;
              gapsGraphics.addChild(gap.sprite);
            }

            tile.allGapsForMouseOver.push({
              gap: gap,
              rect: [drawX - 3, drawX + 3, yOffset, yOffset + totalRowHeight],
            });
          }
        });

        tile.sequenceData[species].forEach((aa) => {
          if (aa.start >= visibleMinX && aa.start <= visibleMaxX) {
            const xMiddle = this._xScale(aa.start + aa.codonLength / 2 + 1);
            graphics.beginFill(aa.backgroundColor);
            const width = (codonWidth * aa.codonLength) / 3;
            graphics.drawRect(
              this._xScale(aa.start + 1),
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

    // Gets the visible exon rectangles with color (for the zoomed out view and mouseOver)
    getVisibleExonRects(tile) {
      const [tileMinX, tileMaxX] = this.getBoundsOfTile(tile);
      const transcripts = tile.tileData;
      const exonRects = [];

      transcripts.forEach((transcript) => {
        const transcriptInfo = transcript.fields;
        const chrOffset = +transcript.chrOffset;

        const transcriptId = this.transcriptId(transcriptInfo);

        if (
          !this.transcriptInfo[transcriptId] ||
          !this.transcriptInfo[transcriptId]["showTranscript"]
        )
          return;

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

        const xStartPos = this._xScale(txStart + 1);
        const xEndPos = this._xScale(txEnd + 1);

        const rectHeight =
          this.activeSpecies.length * (this.rowHeight + this.rowSpacing);

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

          const xStart = this._xScale(exonStart + 1);
          const localWidth = Math.max(
            1,
            this._xScale(exonEnd + 1) - this._xScale(exonStart + 1)
          );

          const rectStartX =
            strand === "+"
              ? Math.min(xStart, xEndPos)
              : Math.max(xStart, xStartPos);
          const rectEndX =
            strand === "+"
              ? Math.min(xStart + localWidth, xEndPos)
              : Math.max(xStart + localWidth, xStartPos);

          // W
          exonRects.push({
            color: this.colors[strand + "1"],
            transcriptId: transcriptId,
            rect: [rectStartX, 0, rectEndX - rectStartX, rectHeight],
          });
        }
      });
      return exonRects;
    }

    // This renders the transcript only
    // exonRects is the result of getVisibleExonRects(tile)
    renderExons(tile, exonRects) {
      exonRects.forEach((exonRect) => {
        // Draw Everything
        tile.rectGraphics.beginFill(exonRect.color);
        tile.rectGraphics.drawRect(...exonRect.rect);
      });
    }

    // exonRects is the result of getVisibleExonRects(tile)
    generateMouseOverRects(exonRects) {
      const exonRectsMouseOver = exonRects.map((exonRect) => {
        const rect = exonRect.rect;
        const exonRectMod = exonRect;
        exonRectMod.rect = [
          rect[0],
          rect[0] + rect[2],
          rect[1],
          rect[1] + rect[3],
        ];
        return exonRectMod;
      });
      return exonRectsMouseOver;
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
                this._xScale(aa.start + 1),
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

      this.pForeground.beginFill(this.colors["white"]);
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
      tile.gapsGraphics.removeChildren();
      tile.gapsGraphics.destroy();
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

    isPointInRectangle(rect, point) {
      if (
        rect[0] < point[0] &&
        rect[1] > point[0] &&
        rect[2] < point[1] &&
        rect[3] > point[1]
      ) {
        return true;
      }
      return false;
    }

    getMouseOverHtml(trackX, trackY) {
      if (!this.tilesetInfo) {
        return "";
      }

      const point = [trackX, trackY];

      for (const tile of this.visibleAndFetchedTiles()) {
        // We first check if the mouse is over a gap
        // tile.allGapsForMouseOver.push({
        //   gap: gap,
        //   rect: [drawX - 2, drawX + 2, yOffset, yOffset + totalRowHeight]
        // })
        for (let i = 0; i < tile.allGapsForMouseOver.length; i++) {
          const rect = tile.allGapsForMouseOver[i].rect;
          const gap = tile.allGapsForMouseOver[i].gap;
          if (this.isPointInRectangle(rect, point)) {
            return `
                <div>
                  <div><b>${gap.seq}</b></div>
                </div>
              `;
          }
        }

        for (let i = 0; i < tile.allExonsForMouseOver.length; i++) {
          const rect = tile.allExonsForMouseOver[i].rect;

          if (this.isPointInRectangle(rect, point)) {
            const transcriptId = tile.allExonsForMouseOver[i].transcriptId;
            const transcript = this.transcriptInfo[transcriptId];

            return `
                <div>
                  <div><b>Transcript: ${transcript.transcriptName}</b></div>
                  <div>Position: ${transcript.chromName}:${transcript.txStart}-${transcript.txEnd}</div>
                  <div>Strand: ${transcript.strand}</div>
                </div>
              `;
          }
        }
      }

      return "";
    }

    exportSVG() {
      let track = null;
      let base = null;

      base = document.createElement("g");
      track = base;

      const clipPathId = slugid.nice();

      const gClipPath = document.createElement("g");
      gClipPath.setAttribute("style", `clip-path:url(#${clipPathId});`);

      track.appendChild(gClipPath);

      // define the clipping area as a polygon defined by the track's
      // dimensions on the canvas
      const clipPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "clipPath"
      );
      clipPath.setAttribute("id", clipPathId);
      track.appendChild(clipPath);

      const clipPolygon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon"
      );
      clipPath.appendChild(clipPolygon);

      clipPolygon.setAttribute(
        "points",
        `${this.position[0]},${this.position[1]} ` +
          `${this.position[0] + this.dimensions[0]},${this.position[1]} ` +
          `${this.position[0] + this.dimensions[0]},${
            this.position[1] + this.dimensions[1]
          } ` +
          `${this.position[0]},${this.position[1] + this.dimensions[1]} `
      );

      const output = document.createElement("g");

      output.setAttribute(
        "transform",
        `translate(${this.position[0]},${this.position[1]})`
      );

      gClipPath.appendChild(output);

      const totalRowHeight = this.rowHeight + this.rowSpacing;
      const codonWidth = this._xScale(3) - this._xScale(0);

      this.visibleAndFetchedTiles()
        .filter((tile) => Object.keys(tile.sequenceData).length > 0)
        .forEach((tile) => {
          const gTile = document.createElement("g");
          gTile.setAttribute(
            "transform",
            `translate(${tile.aminoAcidTextGraphics.position.x},
            ${tile.aminoAcidTextGraphics.position.y})
            scale(${tile.aminoAcidTextGraphics.scale.x},
            ${tile.aminoAcidTextGraphics.scale.y})`
          );

          this.activeSpecies.forEach((as) => {
            const yOffset = as.yPosOffset;
            const yMiddle = yOffset + totalRowHeight / 1;
            const species = as.species;

            if (codonWidth >= this.fontSize) {
              tile.gapsData[species].forEach((gap) => {
                const g = document.createElement("g");
                const p = document.createElement("path");
                const d = `M 0 0 H ${2} V ${this.rowHeight} H 0 Z`;
                p.setAttribute("d", d);
                p.setAttribute("fill", "orange");
                p.setAttribute("opacity", "1");
                g.appendChild(p);
                g.setAttribute(
                  "transform",
                  `translate(${this._xScale(gap.position + 1)},${
                    yOffset + 0.5 * totalRowHeight - this.rowSpacing
                  })scale(1,1)`
                );
                gTile.appendChild(g);
              });

              tile.sequenceData[species].forEach((aa) => {
                const g = document.createElement("g");
                const t = document.createElement("text");
                t.setAttribute("text-anchor", "middle");
                t.setAttribute("font-family", this.options.fontFamily);
                t.setAttribute("font-size", `${this.fontSize}px`);

                if (aa.match) {
                  t.setAttribute("font-weight", "bold");
                }

                t.innerHTML = aa.letter;

                g.appendChild(t);
                g.setAttribute(
                  "transform",
                  `translate(${
                    this._xScale(aa.start + 1) + codonWidth / 2
                  },${yMiddle})scale(1,1)`
                );
                gTile.appendChild(g);
              });
            } else {
              // condensed view

              tile.sequenceData[species].forEach((aa) => {
                if (!aa.match) return;

                const g = document.createElement("g");
                const p = document.createElement("path");
                const width = (codonWidth * aa.codonLength) / 3;
                const d = `M 0 0 H ${width} V ${this.rowHeight} H 0 Z`;
                p.setAttribute("d", d);
                if (aa.strand === "+") {
                  p.setAttribute("fill", this.options.plusStrandColorZoomedOut);
                  p.setAttribute("stroke", this.options.plusStrandColorZoomedOut);
                } else {
                  p.setAttribute("fill", this.options.minusStrandColorZoomedOut);
                  p.setAttribute("stroke", this.options.minusStrandColorZoomedOut);
                }
                p.setAttribute("opacity", "1");
                g.appendChild(p);

                g.setAttribute(
                  "transform",
                  `translate(${this._xScale(aa.start + 1)},${
                    yOffset + 0.5 * totalRowHeight - this.rowSpacing
                  })scale(1,1)`
                );
                gTile.appendChild(g);
              });
            }
          });
          output.appendChild(gTile);
        });

      // Labels
      const totalHeight =
        this.activeSpecies.length * (this.rowHeight + this.rowSpacing) + 5;
      let maxLabelWidth = 0;

      this.activeSpecies.forEach((sp) => {
        maxLabelWidth = Math.max(maxLabelWidth, sp.label.width + 1);
      });

      const gLabelBackground = document.createElement("g");
      const rLabelBackground = document.createElement("path");
      const dLabelBackground = `M 0 0 H ${maxLabelWidth} V ${totalHeight} H 0 Z`;
      rLabelBackground.setAttribute("d", dLabelBackground);
      rLabelBackground.setAttribute("fill", "white");
      rLabelBackground.setAttribute("opacity", "1");
      gLabelBackground.appendChild(rLabelBackground);
      output.appendChild(gLabelBackground);

      this.activeSpecies.forEach((sp, i) => {
        const g = document.createElement("g");
        const t = document.createElement("text");
        t.setAttribute("text-anchor", "start");
        t.setAttribute("font-family", this.options.fontFamily);
        t.setAttribute("font-size", `${this.fontSize}px`);
        t.setAttribute("font-weight", "bold");

        g.setAttribute("transform", `scale(1,1)`);

        t.setAttribute("fill", this.options.labelTextColor);
        t.innerHTML = sp.label.text.text;

        g.appendChild(t);
        g.setAttribute(
          "transform",
          `translate(0,${sp.yPosOffset + totalRowHeight})scale(1,1)`
        );
        output.appendChild(g);
      });

      return [base, base];
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
    "aminoAcidColor",
    "aminoAcidColorNoMatch",
    "fontSize",
    "fontFamily",
    "gapsColor",
    "labelTextColor",
    "minusStrandColor1",
    "minusStrandColor2",
    "minusStrandColorZoomedOut",
    "plusStrandColor1",
    "plusStrandColor2",
    "plusStrandColorZoomedOut",
    "rowHeight",
    "rowSpacing",
    "species",
  ],
  defaultOptions: {
    aminoAcidColor: "#333333",
    aminoAcidColorNoMatch: "#b0b0b0",
    fontSize: 10,
    fontFamily: "Arial",
    gapsColor: "#eb9c00",
    labelTextColor: "#888888",
    minusStrandColor1: "#ffe0e2",
    minusStrandColor2: "#fff0f1",
    minusStrandColorZoomedOut: "#fabec2",
    plusStrandColor1: "#ebebff",
    plusStrandColor2: "#dedeff",
    plusStrandColorZoomedOut: "#bdbfff",
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
  },
};

export default OrthologsTrack;
