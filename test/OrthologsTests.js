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

describe("Orthologs test", () => {
  const fetchMockHelper = new FetchMockHelper("", "OrthologsTest");

  beforeAll(async () => {
    await fetchMockHelper.activateFetchMock();
  });

  describe("Test that the data is correct", () => {
    let hgc = null;
    let div = null;

    beforeAll((done) => {
      [div, hgc] = mountHGComponent(div, hgc, viewConf, done);
    });

    it("Test label data", (done) => {

      const trackObj = getTrackObjectFromHGC(
        hgc.instance(),
        viewConf.views[0].uid,
        viewConf.views[0].tracks.top[0].uid
      );

      const as = trackObj.activeSpecies;
      expect(as.length).to.equal(7);

      done();
    });

    it("Test sequence data", (done) => {

      // We need to wait for Ensemble data
      setTimeout(() => {
        const trackObj = getTrackObjectFromHGC(
          hgc.instance(),
          viewConf.views[0].uid,
          viewConf.views[0].tracks.top[0].uid
        );
  
        const tile = trackObj.visibleAndFetchedTiles()[0];

        const humanSeqData = tile.sequenceData["human"];
        const mouseSeqData = tile.sequenceData["mouse"];

        expect(humanSeqData.length).to.equal(mouseSeqData.length);

        expect(humanSeqData[0].start).to.equal(34794495);
        expect(humanSeqData[0].codonLength).to.equal(3);
        expect(humanSeqData[0].strand).to.equal("+");
        expect(humanSeqData[0].backgroundColor).to.equal(14606079);
        expect(humanSeqData[0].backgroundColor).to.equal(mouseSeqData[0].backgroundColor);

        expect(humanSeqData[1].start).to.equal(34794498);
        expect(humanSeqData[1].codonLength).to.equal(mouseSeqData[1].codonLength);
        expect(humanSeqData[1].backgroundColor).to.equal(15461375);
        expect(humanSeqData[1].backgroundColor).to.equal(mouseSeqData[1].backgroundColor);

        done();
      }, 2000);

    });

    it("Test gap data", (done) => {

      // We need to wait for Ensemble data
      setTimeout(() => {
        const trackObj = getTrackObjectFromHGC(
          hgc.instance(),
          viewConf.views[0].uid,
          viewConf.views[0].tracks.top[0].uid
        );
  
        const tile = trackObj.visibleAndFetchedTiles()[0];

        const gapsDataChicken = tile.gapsData['chicken'];
        expect(gapsDataChicken[0].position).to.equal(34794942);
        expect(gapsDataChicken[0].seq).to.equal("PVPV");

        const gapsDataZebrafish = tile.gapsData['zebrafish'];
        expect(gapsDataZebrafish[0].position).to.equal(34794528);
        expect(gapsDataZebrafish[0].seq).to.equal("P");

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
