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

      const ensemblHelper = new EnsemblHelper();
      this.labels = ensemblHelper.initializeLabelTexts(
        this.labelTextOptions,
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
      tile.codonSeparatorGraphics = new HGC.libraries.PIXI.Graphics();
      tile.codonTextGraphics = new HGC.libraries.PIXI.Graphics();
      tile.labelBgGraphics = new HGC.libraries.PIXI.Graphics();
      tile.labelGraphics = new HGC.libraries.PIXI.Graphics();

      tile.graphics.addChild(tile.rectGraphics);
      tile.graphics.addChild(tile.rectMaskGraphics);
      tile.graphics.addChild(tile.codonSeparatorGraphics);
      tile.graphics.addChild(tile.codonTextGraphics);
      tile.graphics.addChild(tile.labelBgGraphics);
      tile.graphics.addChild(tile.labelGraphics);

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

      tile.initialized = true;

      // We have to rerender everything since the vertical position
      // of the tracks might have changed accross tiles
      this.rerender(this.options, true);
    }

    initOptions() {
      this.fontSize = +this.options.fontSize;
      this.rowHeight = +this.options.rowHeight;
      this.rowSpacing = +this.options.rowSpacing;

      // controls when the abbreviated codon text are displayed
      this.minCodonDistance = 15;

      this.codonTextOptions = {
        fontSize: `${this.fontSize * 2}px`,
        fontFamily: this.options.fontFamily,
        fill: DARKGREY_HEX,
        fontWeight: "bold",
      };

      this.labelTextOptions = {
        fontSize: `${this.fontSize * 2}px`,
        fontFamily: this.options.fontFamily,
        fill: DARKGREY_HEX,
        fontWeight: "bold",
      };

      this.colors = {};

      this.colors["labelFont"] = colorToHex(this.options.fontColor);
      this.colors["black"] = colorToHex("#000000");
      this.colors["labelBackground"] = colorToHex(this.options.labelColor);
      this.colors["+"] = colorToHex(this.options.plusStrandColor);
      this.colors["-"] = colorToHex(this.options.minusStrandColor);
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
      console.log("ActiveSpecies", this.activeSpecies);
    }

    formatTranscriptData(ts) {
      const strand = ts[5];
      const stopCodonPos =
        ts[12] === "." ? "." : strand === "+" ? +ts[12] + 2 : +ts[12] - 1;
      const startCodonPos =
        ts[11] === "." ? "." : strand === "+" ? +ts[11] - 1 : +ts[11] + 2;
      const exonStarts = ts[9].split(",").map((x) => +x - 1);
      const exonEnds = ts[10].split(",").map((x) => +x);
      const txStart = +ts[1] - 1;
      const txEnd = +ts[2];

      const result = {
        transcriptId: this.transcriptId(ts),
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

      this.visibleAndFetchedTiles().forEach((tile) => {
        tile.tileData.forEach((ts) => {
          visibleTranscriptsObj[ts.transcriptId] = ts.fields;
        });
      });

      const visibleTranscripts = [];
      for (const tsId in visibleTranscriptsObj) {
        visibleTranscripts.push(visibleTranscriptsObj[tsId]);
      }

      this.transcriptInfo = {};
      this.transcriptPositionInfo = {};

      this.numTranscriptRows = 0;
      visibleTranscripts
        .sort(function (a, b) {
          return +a[1] - b[1];
        })
        .forEach((ts) => {
          const tsFormatted = this.formatTranscriptData(ts);

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
          };
          this.transcriptInfo[tInfo.transcriptId] = tInfo;
        });

      this.numTranscriptRows = Object.keys(this.transcriptPositionInfo).length;
    }

    /*
     * Redraw the track because the options
     * changed
     */
    rerender(options, force) {
      console.log("rerender");
      const strOptions = JSON.stringify(options);
      if (!force && strOptions === this.prevOptions) return;

      this.options = options;
      this.initOptions();

      this.prevOptions = strOptions;

      this.updateTranscriptInfo();

      this.drawLabels();

      // Adjusting the track height leads to a full rerender.
      // No need to rerender again

      //if (this.trackHeightAdjustment && this.adjustTrackHeight()) return;

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
      tile.labelBgGraphics.clear();

      //const renderContext = [this, tile, this.rowHeight, this.rowSpacing];

      //console.log(tile.tileData);

      this.renderExons(tile);

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

      // otherwise codons are not displayed on startup
      requestAnimationFrame(this.animate);
    }

    renderExons(tile){

      // get the bounds of the tile
      const tileId = +tile.tileId.split(".")[1];
      const zoomLevel = +tile.tileId.split(".")[0]; //track.zoomLevel does not always seem to be up to date
      const tileWidth = +this.tilesetInfo.max_width / 2 ** zoomLevel;
      const tileMinX = this.tilesetInfo.min_pos[0] + tileId * tileWidth; // abs coordinates
      const tileMaxX = this.tilesetInfo.min_pos[0] + (tileId + 1) * tileWidth;

      const transcripts = tile.tileData;
      console.log(tile)

      transcripts.forEach((transcript) => {
        const transcriptInfo = transcript.fields;
        const chrOffset = +transcript.chrOffset;
  
        const transcriptId = this.transcriptId(transcriptInfo);
  
        const exonStarts = this.transcriptInfo[transcriptId]["exonStarts"];
        const exonEnds = this.transcriptInfo[transcriptId]["exonEnds"];

        const strand = this.transcriptInfo[transcriptId]["strand"];
  
        const isProteinCoding = this.transcriptInfo[transcriptId]["startCodonPos"] !== "." && this.transcriptInfo[transcriptId]["stopCodonPos"] !== ".";
  
        if(!isProteinCoding){
          return;
        }
  
        const startCodonPos = this.transcriptInfo[transcriptId]["startCodonPos"] + chrOffset;
        const stopCodonPos = this.transcriptInfo[transcriptId]["stopCodonPos"] + chrOffset;
  
        const txStart = this.transcriptInfo[transcriptId]["txStart"] + chrOffset;
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

        const rectHeight = this.activeSpecies.length * (this.rowHeight + this.rowSpacing);
       
        // draw the actual exons
        for (let j = 0; j < exonOffsetStarts.length; j++) {
          const exonStart = exonOffsetStarts[j];
          const exonEnd = exonOffsetEnds[j];

          // if the exon has no overlap with the tile, go on
          if (exonEnd < tileMinX || exonStart > tileMaxX) {
            continue;
          }

          const isUtr =
            (strand === "+" &&
              (exonEnd <= startCodonPos || exonStart >= stopCodonPos)) ||
            (strand === "-" &&
              (exonStart >= startCodonPos || exonEnd <= stopCodonPos));
          
          if (isUtr) {
            continue;
          }

          const colorUsed = this.colors[strand];
          
          tile.rectGraphics.beginFill(colorUsed);
          tile.rectGraphics.beginFill(colorUsed);
          const xStart = this._xScale(exonStart);
          const localWidth = Math.max(
            1,
            this._xScale(exonEnd) - this._xScale(exonStart)
          );

          let minX = xStartPos;
          let maxX = xEndPos;

          const rectStartX = strand === "+" ?  Math.min(xStart, maxX) : Math.max(xStart, minX);
          const rectEndX = strand === "+" ? Math.min(xStart + localWidth, maxX) : Math.max(xStart + localWidth, minX);
          const localRect = [rectStartX, 0, rectEndX - rectStartX, this.rowHeight + this.rowSpacing];
          console.log(localRect)
           
          tile.rectGraphics.drawRect(rectStartX, 0, rectEndX - rectStartX, rectHeight);


         
        }
  
      
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
        maxLabelWidth+2,
        this.activeSpecies.length * (this.rowHeight + this.rowSpacing)
      );


      this.activeSpecies.forEach((sp, i) => {
        const sprite = sp.label.sprite;
        sprite.position.x = 0;
        sprite.position.y = sp.yPosOffset + this.rowSpacing/2;

        this.pForeground.addChild(sprite);

        this.pForeground.drawRect(
          0,
          (i+1)*(this.rowHeight + this.rowSpacing),
          this.dimensions[0],
          1
        );

      });
    }

    /** cleanup */
    destroyTile(tile) {
      tile.rectGraphics.destroy();
      tile.rectMaskGraphics.destroy();
      tile.labelGraphics.removeChildren();
      tile.labelGraphics.destroy();
      tile.labelBgGraphics.destroy();
      tile.codonSeparatorGraphics.destroy();
      tile.codonTextGraphics.removeChildren();
      tile.codonTextGraphics.destroy();
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

      //console.log(zoomLevel, this._xScale.domain())
      return zoomLevel;
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
  datatype: ["multivec"],
  local: false,
  orientation: "1d-horizontal",
  thumbnail: new DOMParser().parseFromString(icon, "text/xml").documentElement,
  availableOptions: [
    "labelColor",
    "trackBorderColor",
    "backgroundColor",
    "colorScale",
    "barBorder",
    "barBorderColor",
    "fontSize",
    "fontFamily",
    "fontColor",
    "rowHeight",
    "rowSpacing",
    "species",
    "plusStrandColor",
    "minusStrandColor",
  ],
  defaultOptions: {
    labelColor: "black",
    trackBorderColor: "white",
    backgroundColor: "white",
    barBorder: true,
    barBorderColor: "white",
    fontSize: 16,
    fontFamily: "Arial",
    fontColor: "white",
    rowHeight: 10,
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
    plusStrandColor: "#bdbfff",
    minusStrandColor: "#fabec2",
  },
};

export default OrthologsTrack;
