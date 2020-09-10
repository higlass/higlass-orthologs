# Gene orthologs for HiGlass

Display orthologous amino acids in HiGlass!

Zoomed out (shows amino acids that match with the human):

![Orthologs](https://aveit.s3.amazonaws.com/higlass/static/higlass-orthologs-zoomed-out.png)

Zoomed in:

![Orthologs](https://aveit.s3.amazonaws.com/higlass/static/higlass-orthologs-zoomed-in.png)

**Note**: This is the source code for the orthologs track only! You might want to check out the following repositories as well:

- HiGlass viewer: https://github.com/higlass/higlass
- HiGlass server: https://github.com/higlass/higlass-server
- HiGlass docker: https://github.com/higlass/higlass-docker

## Installation
 
```
npm install higlass-orthologs
```

## Data preparation

The orthologs data is loaded from Ensembl via their Rest API in the client (example URL: https://rest.ensembl.org/homology/id/ENSG00000139618?type=orthologues&content-type=application/json&cigar_line=0&target_species=cat&target_species=dog). In order to determine where to display the individual amino acids in the track, we need to know the representative (human) transcript that was used to create the aligned sequences. The sequences from Ensembl are then distributed onto the exons of that transcript.

In order to obtain the representative sequences we use Ensemble Biomart (https://m.ensembl.org/biomart) with the following attributes:

![Biomart](https://aveit.s3.amazonaws.com/higlass/static/Ensembl-biomart-settings.png)

The "Query protein or transcript ID" fields contain the information to identify the correct transcript that we need to use in the track. Store this data to a file and run

```
python /scripts/get_representative_transcripts.py
```
to obtain the `bed` file that will serve as base for the orthologs track.

To create an aggregated `beddb` file from that data, you can use the script
```
python /scripts/aggregate_transcripts.py
```
An example `beddb` file can be found in the `examples` folder.

To ingest the data into higlass-server:
```
python manage.py ingest_tileset \
    --filename /data/representative_transcripts.beddb \
    --filetype beddb \
    --coordSystem hg38 \
    --datatype gene-annotation \
    --uid canonical_transcripts_hg38
```

## Usage

The live script can be found at:

- https://unpkg.com/higlass-transcripts/dist/higlass-orthologs.js

### Client

1. Make sure you load this track after the HiGlass core script. For example:

```
<script src="hglib.js"></script>
<script src="/higlass-orthologs.js"></script>
<script>
  ...
</script>
```

### Options
The following options are available:
```
{
  "server": "http://localhost:8001/api/v1",
  "tilesetUid": "awesome_orthologs",
  "uid": "awesome_orthologs_uid",
  "type": "horizontal-orthologs",
  "options": {
    "aminoAcidColor": "#333333", // font color of amino acids that match with the human one
    "aminoAcidColorNoMatch": "#b0b0b0", // font color of amino acids that don't match with the human one
    "fontSize": 10, // font size for labels and amino acids
    "fontFamily": "Arial", // font family for labels and amino acids
    "gapsColor": "#eb9c00", // color to indicate gaps in the sequence alignment
    "labelTextColor": "#888888", // color of labels
    "minusStrandColor1": "#ffe0e2", // background color 1 of amino acids on the negative strand
    "minusStrandColor2": "#fff0f1", // background color 2 of amino acids on the negative strand
    "minusStrandColorZoomedOut": "#fabec2", // color of horizontal bars, when zoomed out
    "plusStrandColor1": "#ebebff", // background color 1 of amino acids on the positive strand
    "plusStrandColor2": "#dedeff", // background color 2 of amino acids on the positive strand
    "plusStrandColorZoomedOut": "#bdbfff", // color of horizontal bars, when zoomed out
    "rowHeight": 11, // height of each row in the table
    "rowSpacing": 2, // space between rows
    "species": [
      "human",
      "macaca_mulatta",
      "mouse",
      "dog",
      "elephant",
      "chicken",
      "zebrafish",
    ], // the species to compare. Currently only a certain species are supported. More can be added in the EnsemblHelper class
  },
  "width": 768,
  "height": 200
}
```

### ECMAScript Modules (ESM)

We also build out ES modules for usage by applications who may need to import or use `higlass-orthologs` as a component.

Whenever there is a statement such as the following, assuming `higlass-orthologs` is in your node_modules folder:
```javascript
import { OrthologsTrack } from 'higlass-orthologs';
```

Then TranscriptsTrack would automatically be imported from the `./es` directory (set via package.json's `"module"` value). 

## Support

For questions, please either open an issue or ask on the HiGlass Slack channel at http://bit.ly/higlass-slack

## Development

### Testing

To run the test suite:

```
npm run test-watch
```

### Installation

```bash
$ git clone https://github.com/higlass/higlass-orthologs.git
$ cd higlass-orthologs
$ npm install
```
If you have a local copy of higlass, you can then run this command in the higlass-orthologs directory:

```bash
npm link higlass
```

### Commands

 - **Developmental server**: `npm start`
 - **Production build**: `npm run build`
