from __future__ import print_function

__author__ = "Alexander Veit"

import collections as col
import sys
import argparse
from gtfparse import read_gtf


class GeneInfo:
    def __init__(self):
        pass


def main():
    parser = argparse.ArgumentParser(
        description="""

    python ExonUnion.py Calculate the union of the exons of a list
    of transcript.

    chr10   27035524        27150016        ABI1    76      -       NM_001178120    10006   protein-coding  abl-interactor 1        27037498        27149792        10      27035524,27040526,27047990,27054146,27057780,27059173,27060003,27065993,27112066,27149675,      27037674,27040712,27048164,27054247,27057921,27059274,27060018,27066170,27112234,27150016,
"""
    )

    parser.add_argument("--gtf_file")
    parser.add_argument("--transcript_bed")
    # parser.add_argument('-o', '--options', default='yo',
    # help="Some option", type='str')
    # parser.add_argument('-u', '--useless', action='store_true',
    # help='Another useless option')
    args = parser.parse_args()

    # returns GTF with essential columns such as "feature", "seqname", "start", "end"
    # alongside the names of any optional keys which appeared in the attribute column
    df = read_gtf(args.gtf_file)

    # filter DataFrame to gene entries on chrY
    #df_transcripts = df[df["feature"] == "start_codon"]
    #df_transcripts = df[df["transcript_name"] == "SAMD11-201"]
    #df_transcripts = df[df["gene_name"] == "PRKCZ"] 
    df_transcripts = df[df["gene_id"] == "ENSG00000287777.1"]
    #df_transcripts = df.head()
    # gene_id = "ENST00000445297"
    # df_transcripts = df[df["transcript_id"].str.contains(gene_id)]
    #df_genes_chrY = df_genes[df_genes["seqname"] == "Y"]
    
    print(df_transcripts.to_string())
    print("--")

    # start_codons = df_transcripts[df_transcripts["feature"] == "start_codon"]
    # start_codon = start_codons[start_codons["transcript_id"].str.contains(gene_id)]
    # print(len(start_codon.index))

    # stop_codons = df_transcripts[df_transcripts["feature"] == "stop_codon"]
    # stop_codon = stop_codons[stop_codons["transcript_id"].str.contains(gene_id)]
    # print(len(stop_codon.index))


    # cds = df_transcripts[df_transcripts["feature"] == "CDS"]
    # cds_max = cds[cds.exon_number == cds.exon_number.max()]
    # print(cds.to_string())
    # print("--")
    # print(cds_max.to_string())
    # print("--")
    # print(cds_max.iloc[0]['start'])
    # print("--")
    # print(df_transcripts.to_string())


    #print(start_codon.to_string())
    #print(start_codon.iloc[0]['start'])
    #print(df.columns)

    # inputFile = open(args.transcript_bed, "r")

    # gene_infos = col.defaultdict(list)

    # for line in inputFile:
    #     words = line.strip().split("\t")

    #     gene_info = GeneInfo()

    #     try:
    #         gene_info.chrName = words[0]
    #         gene_info.txStart = words[1]
    #         gene_info.txEnd = words[2]
    #         gene_info.geneName = words[3]
    #         gene_info.score = words[4]
    #         gene_info.strand = words[5]
    #         gene_info.refseqId = words[6]
    #         gene_info.geneId = words[7]
    #         gene_info.geneType = words[8]
    #         gene_info.geneDesc = words[9]
    #         gene_info.cdsStart = words[10]
    #         gene_info.cdsEnd = words[11]
    #         gene_info.exonStarts = words[12]
    #         gene_info.exonEnds = words[13]
    #     except:
    #         print("ERROR: line:", line, file=sys.stderr)
    #         continue

    #     # for some reason, exon starts and ends have trailing commas
    #     gene_info.exonStartParts = gene_info.exonStarts.strip(",").split(",")
    #     gene_info.exonEndParts = gene_info.exonEnds.strip(",").split(",")
    #     gene_info.exonUnions = set(
    #         [
    #             (int(s), int(e))
    #             for (s, e) in zip(gene_info.exonStartParts, gene_info.exonEndParts)
    #         ]
    #     )

    #     # add this gene info by checking whether it overlaps with any existing ones
    #     gene_infos = merge_gene_info(gene_infos, gene_info)

    # for gene_id in gene_infos:
    #     for contig in gene_infos[gene_id]:

    #         print(sorted(contig.exonUnions)[0])

    #         output = "\t".join(
    #             map(
    #                 str,
    #                 [
    #                     contig.chrName,
    #                     contig.txStart,
    #                     contig.txEnd,
    #                     contig.geneName,
    #                     contig.score,
    #                     contig.strand,
    #                     "union_" + gene_id,
    #                     gene_id,
    #                     contig.geneType,
    #                     contig.geneDesc,
    #                     contig.cdsStart,
    #                     contig.cdsEnd,
    #                     ",".join([str(e[0]) for e in sorted(contig.exonUnions)]),
    #                     ",".join([str(e[1]) for e in sorted(contig.exonUnions)]),
    #                 ],
    #             )
    #         )
    #         #print(output)


if __name__ == "__main__":
    main()
