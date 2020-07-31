class EnsemblHelper {
  constructor() {}

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

  initializeAminoAcidTexts(settings, Pixilib) {

    const aas = ['X','W','C','G','R','S','T','A','P','F','L','V','I','M','Q','H','D','E','K','N','Y'];
    const aminoAcids = {}

    let maxWidth = 0;
    let maxHeight = 0;

    aas.forEach((aa) => {

      const pixiText = new Pixilib.Text(
        aa,
        settings
      );
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

      const pixiSprite = new Pixilib.Sprite(
        pixiText.texture
      );
      pixiSprite.width = width;
      pixiSprite.height = height;

      aminoAcids[aa] = {
        pText: pixiText,
        texture: pixiText.texture,
        pSprite: pixiSprite,
        width: width,
        height: height
      }

    });

    aminoAcids['maxWidth'] = maxWidth;
    aminoAcids['maxHeight'] = maxHeight;

    return aminoAcids;
    
  }


  initializeLabelTexts(settings, Pixilib) {
    const spMapping = this.getSpeciesMapping();
    const labels = Object.keys(spMapping);
    const pixiLabels = {};

    labels.forEach((label) => {
      const pixiLabel = {};
      const text = new Pixilib.Text(spMapping[label].display, settings);
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

  getHumanSeq(geneId) {
    // We can use any species to get the human sequence
    const url =
      "https://rest.ensembl.org/homology/id/" +
      geneId +
      "?type=orthologues&content-type=application/json&target_species=dog&aligned=0";

    const response = fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((r) => r.json())
      .then((r) => {
        if('error' in r){
          return null;
        }else{
          return r.data[0].homologies[0].source.seq;
        }
      })
      .catch((err) => {
        console.warn("err:", err);
        return null;
      });

    return response;
  }
}

export default EnsemblHelper;
