from gtfparse import read_gtf
import gzip
import csv
import random
import requests
import json


# In order to extract the (human) protein ids thata are used for the ensemble orthologs data,
# we open Biomart (https://m.ensembl.org/biomart/martview)
# Filters: 
# None
#
# Attributes:
# 0 -  Gene stable ID	
# 1 -  Transcript stable ID	
# 2 -  Protein stable ID	
# 3 -  Mouse gene stable ID	
# 4 -  Query protein or transcript ID	
# 5 -  Dog gene stable ID	
# 6 -  Query protein or transcript ID	
# 7 -  Elephant gene stable ID	
# 8 -  Query protein or transcript ID	
# 9 -  Chicken gene stable ID	
# 10 - Query protein or transcript ID	
# 11 - Zebrafish gene stable ID	
# 12 - Query protein or transcript ID	
# 13 - Macaque gene stable ID	
# 14 - Query protein or transcript ID

# The orthologs data can be checked here:
# https://rest.ensembl.org/homology/id/ENSG00000226892?type=orthologues&content-type=application/json&cigar_line=0&sequence=none


# Input/Output file names (need to be in same folder)
rep_prot = 'representative_protein_ids_ensembl.txt'

output_file = 'representative_transcripts.txt'

tsv_file = open(rep_prot, 'r')

read_tsv = csv.reader(tsv_file, delimiter="\t")

# Header

# 0 -  Gene stable ID	
# 1 -  Transcript stable ID	
# 2 -  Protein stable ID	
# 3 -  Mouse gene stable ID	
# 4 -  Query protein or transcript ID	
# 5 -  Dog gene stable ID	
# 6 -  Query protein or transcript ID	
# 7 -  Elephant gene stable ID	
# 8 -  Query protein or transcript ID	
# 9 -  Chicken gene stable ID	
# 10 - Query protein or transcript ID	
# 11 - Zebrafish gene stable ID	
# 12 - Query protein or transcript ID	
# 13 - Macaque gene stable ID	
# 14 - Query protein or transcript ID

# This skips the first row of the CSV file.
next(read_tsv)

ensemble_data = []

for row in read_tsv:
    ensemble_data.append(row)

tsv_file.close()

# Compute a mapping from protein ids to transcript ids
protein_id_2_transcript_id = {}
for row in ensemble_data:
    protein_id = row[2]
    transcript_id = row[1]
    if not protein_id:
        continue

    protein_id_2_transcript_id[protein_id] = transcript_id

# print(protein_id_2_transcript_id)
representative_transcrpts = []

for row in ensemble_data:
    # We collect all the query_proteins, we expect them to be all the same. If one of them is not empty, we record it
    query_proteins = [row[4], row[6], row[8], row[10], row[12], row[14]]

    # remove empty strings
    query_proteins = [i for i in query_proteins if i] 

    if len(query_proteins) == 0:
        continue

    query_protein_id = query_proteins[0]

    if "ENST" in query_protein_id:
        representative_transcrpts.append(query_protein_id)
    elif "ENSP" in query_protein_id:
        representative_transcrpts.append(protein_id_2_transcript_id[query_protein_id])

# Make unique
myset = set(representative_transcrpts)
representative_transcrpts = list(myset)

# print(representative_transcrpts)
# print(len(representative_transcrpts))


with open(output_file, 'w') as filehandle:
    json.dump(representative_transcrpts, filehandle)