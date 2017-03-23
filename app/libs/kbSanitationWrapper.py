#! /projects/tumour_char/analysis_scripts/python/centos06/anaconda3_v4.3.0/envs/python3.4/bin/python

import sys
import argparse
import json

# Include KB utils library
sys.path.insert(0, '/projects/tumour_char/analysis_scripts/SVIA/databases/knowledge_base/tags/v2.4.2')
from kb_tools.event import EventCombination

# Basic main wrapper function
def main():
    parser = argparse.ArgumentParser(description="KB entry string to be validated")
    parser.add_argument('--input', dest='inputString', help="The string to be validated")
    args = parser.parse_args()

    response = EventCombination.parse(args.inputString)

    list = []

    # import pdb; pdb.set_trace()
    for item in response:
        list.append(item.events[0][0].type + "_" +item.events[0][0].notation_string)

    print(json.dumps(list))

main()