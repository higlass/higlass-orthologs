

class EnsemblHelper {

  constructor() {}


  getSpeciesMapping(){

    const mapping = {};

    mapping['chimp'] = 'pan_troglodytes';
    mapping['gorilla'] = 'gorilla_gorilla';
    mapping['macaca_mulatta'] = 'macaca_mulatta';
    mapping['mouse'] = 'mus_musculus';
    mapping['guinea pig'] = 'cavia_porcellus';
    mapping['rabbit'] = 'oryctolagus_cuniculus';
    mapping['rat'] = 'rattus_norvegicus';
    mapping['pig'] = 'sus_scrofa';
    mapping['cow'] = 'bos_taurus';
    mapping['sheep'] = 'ovis_aries';
    mapping['horse'] = 'equus_caballus';
    mapping['dog'] = 'canis_lupus_familiaris';
    mapping['elephant'] = 'loxodonta_africana';
    mapping['chicken'] = 'gallus_gallus';
    mapping['xenopus_tropicalis'] = 'xenopus_tropicalis';
    mapping['zebrafish'] = 'danio_rerio';
    mapping['lamprey'] = 'petromyzon_marinus';

    return mapping;

  }

  initializeLabelTexts(settings, Pixilib){

    const labels = Object.keys(this.getSpeciesMapping());
    const pixiLabels = [];

    labels.forEach((label) => {
      const text = new Pixilib.Text(label, settings);
      text.interactive = true;
      text.anchor.x = 0;
      text.anchor.y = 0;
      text.visible = true;
      pixiLabels.push(text);
    })

    return pixiLabels;

  }

  
 
}

export default EnsemblHelper;
