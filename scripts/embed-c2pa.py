"""AI görseline DALL-E tarzı C2PA/XMP imzası gömer (gerçek OpenAI çıktıları böyle imzalanır).
Test simülasyonudur: ai-proof.png -> ai-proof-c2pa.png"""
import struct
import zlib

SRC = "/home/z/my-project/public/proof/ai-proof.png"
DST = "/home/z/my-project/public/proof/ai-proof-c2pa.png"

XMP = """<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="OpenAI C2PA Toolkit 1.2">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:c2pa="urn:c2pa:spec:1.0:manifest"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
   <c2pa:ClaimGenerator>DALL-E 3 / OpenAI</c2pa:ClaimGenerator>
   <c2pa:AssertionList>
    <rdf:Bag><rdf:li>trainedalgorithmicmedia</rdf:li></rdf:Bag>
   </c2pa:AssertionList>
   <dc:Creator><rdf:Seq><rdf:li>OpenAI DALL-E</rdf:li></rdf:Seq></dc:Creator>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""

with open(SRC, "rb") as f:
    data = f.read()

itxt_data = b"XML:com.adobe.xmp" + b"\x00\x00\x00\x00\x00" + XMP.encode("utf-8")
chunk_type = b"iTXt"
crc = zlib.crc32(chunk_type + itxt_data) & 0xFFFFFFFF
chunk = struct.pack(">I", len(itxt_data)) + chunk_type + itxt_data + struct.pack(">I", crc)

# Insert after IHDR (8-byte signature + 4 len + 4 type + 13 data + 4 crc = 33)
pos = 33
out = data[:pos] + chunk + data[pos:]
with open(DST, "wb") as f:
    f.write(out)

print(f"OK: {DST} ({len(out)} bytes)")

# Verify scan
with open(DST, "rb") as f:
    raw = f.read().decode("latin1").lower()
for sig in ["dall-e", "openai", "c2pa", "trainedalgorithmicmedia"]:
    print(f"  '{sig}':", "BULUNDU" if sig in raw else "yok")
