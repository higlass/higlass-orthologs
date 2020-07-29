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

  initializeLabelTexts(settings, Pixilib) {
    const spMapping = this.getSpeciesMapping()
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
}

export default EnsemblHelper;
