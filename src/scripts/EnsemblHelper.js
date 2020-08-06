class EnsemblHelper {
  constructor() {
    this.speciesMapping = this.getSpeciesMapping();
    this.seqDataCache = [];
  }

  getSpeciesMapping() {
    const mapping = {};

    mapping["human"] = {
      ensembleId: "homo_sapiens",
      display: "Human",
    };
    mapping["chimp"] = {
      ensembleId: "pan_troglodytes",
      display: "Chimpanzee",
    };
    mapping["gorilla"] = {
      ensembleId: "gorilla_gorilla",
      display: "Gorilla",
    };
    mapping["macaca_mulatta"] = {
      ensembleId: "macaca_mulatta",
      display: "Rhesus",
    };
    mapping["mouse"] = {
      ensembleId: "mus_musculus",
      display: "Mouse",
    };
    mapping["guinea pig"] = {
      ensembleId: "cavia_porcellus",
      display: "Guinea pig",
    };
    mapping["rabbit"] = {
      ensembleId: "oryctolagus_cuniculus",
      display: "Rabbit",
    };
    mapping["rat"] = {
      ensembleId: "rattus_norvegicus",
      display: "Rat",
    };
    mapping["pig"] = {
      ensembleId: "sus_scrofa",
      display: "Pig",
    };
    mapping["cow"] = {
      ensembleId: "bos_taurus",
      display: "Cow",
    };
    mapping["sheep"] = {
      ensembleId: "ovis_aries",
      display: "Sheep",
    };
    mapping["horse"] = {
      ensembleId: "equus_caballus",
      display: "Horse",
    };
    mapping["dog"] = {
      ensembleId: "canis_lupus_familiaris",
      display: "Dog",
    };
    mapping["elephant"] = {
      ensembleId: "loxodonta_africana",
      display: "Elephant",
    };
    mapping["chicken"] = {
      ensembleId: "gallus_gallus",
      display: "Chicken",
    };
    mapping["xenopus_tropicalis"] = {
      ensembleId: "xenopus_tropicalis",
      display: "Tropical clawed frog",
    };
    mapping["zebrafish"] = {
      ensembleId: "danio_rerio",
      display: "Zebrafish",
    };
    mapping["lamprey"] = {
      ensembleId: "petromyzon_marinus",
      display: "Lamprey",
    };

    return mapping;
  }

  getSeqCacheId(geneId, species){
    return geneId + species.join('');
  }

  getSeqData(geneId, transcriptId, species){
    const id = this.getSeqCacheId(geneId, species);

    const foundElement = this.seqDataCache.find((e) => Object.keys(e)[0] === id);

    if(!foundElement){
      return this.getSpeciesSequencesFromEnsembl(geneId, transcriptId, species);
    }
    else{
      const result = new Promise((resolve, reject) => {
        resolve(foundElement[id]);
      }) 
      return result;
    }

  }

  addToSeqCache(geneId, species, speciesSeqData){

    if(this.seqDataCache.find((e) => Object.keys(e)[0] === id)){
      return;
    }
    const id = this.getSeqCacheId(geneId, species);

    if(this.seqDataCache.length > 10){
      this.seqDataCache.pop();
    }

    const dataToAdd = {};
    dataToAdd[id] = speciesSeqData;
    this.seqDataCache.unshift(dataToAdd);
  }

  ensembleIdToAlias(ensembleId) {
    let alias = null;

    Object.keys(this.speciesMapping).forEach((sp) => {
      if (this.speciesMapping[sp].ensembleId === ensembleId) {
        alias = sp;
      }
    });
    return alias;
  }

  initializeAminoAcidTexts(settings, Pixilib) {
    const aas = [
      "X",
      "W",
      "C",
      "G",
      "R",
      "S",
      "T",
      "A",
      "P",
      "F",
      "L",
      "V",
      "I",
      "M",
      "Q",
      "H",
      "D",
      "E",
      "K",
      "N",
      "Y",
      "-",
    ];
    const aminoAcids = {};

    let maxWidth = 0;
    let maxHeight = 0;

    aas.forEach((aa) => {
      const pixiText = new Pixilib.Text(aa, settings);
      pixiText.updateText();

      pixiText.anchor.x = 0;
      pixiText.anchor.y = 0;
      pixiText.visible = true;

      // We get sharper edges if we scale down a large text
      // This holds the 3 letter AA
      const width = pixiText.getBounds().width / 2;
      maxWidth = Math.max(maxWidth, width);
      const height = pixiText.getBounds().height / 2;
      maxHeight = Math.max(maxHeight, height);

      const pixiSprite = new Pixilib.Sprite(pixiText.texture);
      pixiSprite.width = width;
      pixiSprite.height = height;

      aminoAcids[aa] = {
        pText: pixiText,
        texture: pixiText.texture,
        pSprite: pixiSprite,
        width: width,
        height: height,
      };
    });

    aminoAcids["maxWidth"] = maxWidth;
    aminoAcids["maxHeight"] = maxHeight;

    return aminoAcids;
  }

  initializeLabelTexts(settings, Pixilib) {
    const labels = Object.keys(this.speciesMapping);
    const pixiLabels = {};

    labels.forEach((label) => {
      const pixiLabel = {};
      const text = new Pixilib.Text(
        this.speciesMapping[label].display,
        settings
      );
      text.interactive = true;
      text.anchor.x = 0;
      text.anchor.y = 0;
      text.visible = true;
      pixiLabel["text"] = text;
      pixiLabel["width"] = text.getBounds().width / 2;
      pixiLabel["height"] = text.getBounds().height / 2;

      const pixiSprite = new Pixilib.Sprite(text.texture);
      pixiSprite.width = pixiLabel["width"];
      pixiSprite.height = pixiLabel["height"];

      pixiLabel["sprite"] = pixiSprite;

      pixiLabels[label] = pixiLabel;
    });

    return pixiLabels;
  }


  getSpeciesSequencesFromEnsembl(geneId, transcriptId, species) {
    // Example request URL
    // http://rest.ensembl.org/homology/id/ENSG00000139618?type=orthologues&content-type=application/json&cigar_line=0&target_species=cat&target_species=dog
    // We can't only load the cigar line, because we need the actual sequence of the species -
    // not only they they match with the human or not.

    let speciesParam = "";

    species.forEach((s) => {
      speciesParam += "&target_species=" + s;
    });

    const url =
      "http://rest.ensembl.org/homology/id/" +
      geneId +
      "?type=orthologues&content-type=application/json&cigar_line=0" +
      speciesParam;

    // whenever possible, used the cached version (we assume that the ensemble data does not change)
    const response = fetch(url, {
      cache: "force-cache",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((r) => r.json())
      .then((r) => {
        if ("error" in r) {
          return {};
        } else {
          const homologies = r.data[0].homologies;
          const speciesSeqData = {};

          homologies.forEach((h,i) => {

            const alias = this.ensembleIdToAlias(h.target.species);
            if (!alias) return;

            const humanSeq = h.source.align_seq;
            const speciesSeq = h.target.align_seq;

            // we have to treat the human seq separately, since it is not present in the homologies array
            if(i === 0){
              const refSeq = humanSeq.replace("-","").split("").map((s) => {
                return {
                  aa: s,
                  match: true,
                }
              });
              speciesSeqData["human"] = {
                gaps: Array.from({length: refSeq.length}, (v, i) => ""),
                seq: refSeq,
              };
            }

            speciesSeqData[alias] = this.processAlignedSequences(
              humanSeq,
              speciesSeq
            );
          });

          // const availableSpecies = Object.keys(speciesSeqData);
          // const unavailableSpecies = species.filter((s) => !availableSpecies.includes(s));

          const result = {
            transcriptId,
            speciesSeqData
          }

          this.addToSeqCache(geneId, species, result);

          return result;
        }
      })
      .catch((err) => {
        console.warn("err:", err);
        return {};
      });

    return response;
  }

  /**
   *
   * @param {str} humanSeq aligned human sequence from Ensemble
   * @param {str} speciesSeq aligned species sequence from Ensemble
   *
   * Returns the species sequence that can be ligned up with the unaligned human sequecne,
   * together with a array that contains the gaps
   */
  processAlignedSequences(humanSeq, speciesSeq) {
    const hSeq = humanSeq.split("");
    const sSeq = speciesSeq.split("");

    if (hSeq.length !== sSeq.length) {
      console.warn("Aligned Ensemble sequences don't have the same length");
      return null;
    }

    const gaps = [];
    const processedSeq = [];
    let currentGap = "";

    for (var i = 0, len = hSeq.length; i < len; i++) {
      if (hSeq[i] === "-") {
        currentGap += sSeq[i]; // accumulate AAs in current gap
      } else {
        gaps.push(currentGap);
        processedSeq.push({
          aa: sSeq[i],
          match: hSeq[i] === sSeq[i],
        });
        currentGap = "";
      }
    }

    const seqData = {
      gaps: gaps,
      seq: processedSeq,
    };

    return seqData;
    //console.log(gaps.join('-'))
    //console.log(processedSeq.map((s)=>s.aa).join(''))
  }
}

export default EnsemblHelper;
