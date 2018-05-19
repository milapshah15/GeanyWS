import re

myfile = open("testSpecial.txt", "r")
for i,line in enumerate(myfile):
    print "Line#" + str(i+1) + ":" + "Valid" if re.match("^[a-zA-Z0-9_]*$", line) else "Line#" + str(i+1) + ":" + "Invalid"