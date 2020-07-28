import { scaleLinear } from "d3-scale";
import { color } from "d3-color";

const OrthologsTrack = (HGC, ...args) => {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"'
    );
  }

  // Services
  const { tileProxy, pixiRenderer } = HGC.services;

  // Utils
  const { colorToHex } = HGC.utils;

  class OrthologsTrackClass extends HGC.tracks.HorizontalGeneAnnotationsTrack {

    constructor(context, options) {

      super(context, options);

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
  },
};

export default OrthologsTrack;
