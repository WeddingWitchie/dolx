#!/usr/bin/env python3
import fileinput
import re
import sys

WARNING = '\033[93m'
ENDC = '\033[0m'

def myprint(*args):
	global filename
	print(WARNING, filename + ":", ENDC,*args)

def yield_line_and_islastline(f):
	global filename
	global linenumber
	try:
		prevline = next(f)
		filename = fileinput.filename()
		linenumber = fileinput.filelineno()
	except StopIteration:
		return
	for line in f:
		yield (prevline, f.isfirstline())
		filename = fileinput.filename()
		linenumber = fileinput.filelineno()
		prevline = line
	yield prevline, True

pattern = re.compile(r'(<<(\/?) *(if|for|else|switch|case|replace|link)[^a-zA-Z][^<>]*)')

# Strip /* */ and <!-- --> comments (possibly spanning lines) so literal macro text inside comments doesn't produce false tag-mismatch reports.
# comment_state[0] holds the closing token we're looking for, or None.
def strip_comments(line, comment_state):
	result = []
	i = 0
	while i < len(line):
		if comment_state[0]:
			end = line.find(comment_state[0], i)
			if end == -1:
				return "".join(result)
			i = end + len(comment_state[0])
			comment_state[0] = None
		else:
			candidates = [(p, close) for p, close in ((line.find("/*", i), "*/"), (line.find("<!--", i), "-->")) if p != -1]
			if not candidates:
				result.append(line[i:])
				break
			p, close = min(candidates)
			result.append(line[i:p])
			comment_state[0] = close
			i = p + (2 if close == "*/" else 4)
	return "".join(result)

tagfound = []
comment_state = [None]
try:
	for line, isLastLine in yield_line_and_islastline(fileinput.input(openhook=fileinput.hook_encoded("utf-8"))):
		line = strip_comments(line, comment_state)
		for (whole,end,tag) in re.findall(pattern,line):
			if tag == "else" or tag == 'case':
				if len(tagfound) == 0:
					myprint("Found", tag, "but with no opening tag:")
					myprint("  ", linenumber,":", whole)
					fileinput.nextfile()
				lasttag = tagfound[-1]
				if (tag == "else" and lasttag["tag"] != "if") or (tag == "case" and lasttag["tag"] != "switch"):
					myprint("Mismatched else: Opening tag was:")
					myprint("  ",lasttag["linenumber"],":", lasttag["whole"])
					myprint("But this tag was:")
					myprint("  ",linenumber,":", whole)
					fileinput.nextfile()
					break
			elif end != '/':
				tagfound.append({"whole": whole, "linenumber":linenumber,"tag":tag})
			else:
				if len(tagfound) == 0:
					myprint("Found closing tag but with no opening tag:")
					myprint("  ", linenumber,":", whole)
					fileinput.nextfile()
					break
				lasttag = tagfound.pop()
				if lasttag["tag"] != tag:
					myprint("Mismatched tag: Opening tag was:")
					myprint("  ",lasttag["linenumber"],":", lasttag["whole"])
					myprint("Closing tag was:")
					myprint("  ",linenumber,":", whole)
					fileinput.nextfile()
					break

		if isLastLine:
			if len(tagfound) != 0:
				myprint("End of file found but", len(tagfound), ("tag hasn't" if len(tagfound)==1 else "tags haven't"), "been closed:")
			for tag in tagfound:
				myprint("  ", tag["linenumber"],":", tag["whole"])
			tagfound = []
			comment_state[0] = None
except UnicodeDecodeError as e:
	myprint(e)
	print("   Hint: In Linux, you can get more details about Unicode errors by running:")
	print("	 isutf8", fileinput.filename())
	print("   :Note it might be caused by ", filename)
