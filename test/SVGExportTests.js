import { expect } from "chai";
import register from "higlass-register";

import FetchMockHelper from "./utils/FetchMockHelper";

import { HiGlassComponent, getTrackObjectFromHGC } from "higlass";

import {
  waitForDataLoaded,
  mountHGComponent,
  removeHGComponent,
} from "./utils/test-helpers";

import viewConf from "./view-configs/simple-track";

import OrthologsTrack from "../src/scripts/OrthologsTrack";

register({
  name: "OrthologsTrack",
  track: OrthologsTrack,
  config: OrthologsTrack.config,
});

describe("SVG export", () => {
  const fetchMockHelper = new FetchMockHelper("", "SVGExport");

  beforeAll(async () => {
    await fetchMockHelper.activateFetchMock();
  });

  describe("SVG export", () => {
    let hgc = null;
    let div = null;

    beforeAll((done) => {
      [div, hgc] = mountHGComponent(div, hgc, viewConf, done);
    });

    it("tests that the export works", (done) => {
      

      setTimeout(() => {
        hgc.instance().handleExportSVG();

        done();
      }, 2000);
      
    });

    afterAll(() => {
      removeHGComponent(div);
    });
  });

  afterAll(async () => {
    await fetchMockHelper.storeDataAndResetFetchMock();
  });
});
