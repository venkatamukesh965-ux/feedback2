from flask import Flask, request, jsonify, render_template, send_file, send_from_directory
from werkzeug.utils import secure_filename
from xml.etree import ElementTree as ET
from io import BytesIO
from collections import Counter, defaultdict
from datetime import datetime
import csv, json, io, re, math, os

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    REPORTLAB_OK = True
except Exception:
    REPORTLAB_OK = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
app = Flask(__name__, template_folder="templates")
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

STOPWORDS = set("""
a an the and or but if then than so because as at by for from in into of on to with without is are was were be been being
this that these those it its i you your yours he she they them their our we us my me his her have has had do does did can could
would should will may might must not no yes very more most less least much many some any all each every both either neither
there here where when what which who whom why how about above below after before during through over under again further once
also just only own same too very really quite get got getting make made makes use used using user users people customer customers
feedback review reviews issue issues problem problems app platform product feature features thing things one two three new old
good great bad better best worst please thanks thank thankyou work works working worked need needs needed want wants wanted
help helps helped error errors bug bugs unable cannot can't won't don't didn't isn't aren't wasn't weren't
""".split())

POSITIVE = set("good great excellent love loved like liked easy useful helpful fast quick smooth perfect amazing awesome happy satisfied solved works working reliable clear".split())
NEGATIVE = set("bad poor terrible worst hate hated dislike difficult hard slow broken bug error fail failed failure issue problem problems unable confusing confused crash crashed wrong missing costly annoying frustrating frustrated useless".split())

ISSUE_HINTS = [
    "not working","does not work","doesn't work","cannot","can't","unable","error","bug","crash","crashing",
    "slow","broken","missing","failed","failure","problem","issue","wrong","difficult","confusing","frustrating",
    "stuck","timeout","incorrect","unavailable","lag","freeze","payment","login","search","notification","performance"
]

def clean_text(v):
    if v is None: return ""
    return re.sub(r"\s+", " ", str(v)).strip()

def norm_key(k):
    return re.sub(r"[^a-z0-9]+", "_", str(k).lower()).strip("_")

def scalar(v):
    if v is None: return ""
    if isinstance(v, (str,int,float,bool)): return str(v)
    return json.dumps(v, ensure_ascii=False)

def flatten_obj(obj, prefix=""):
    out={}
    if isinstance(obj, dict):
        for k,v in obj.items():
            nk=f"{prefix}_{norm_key(k)}" if prefix else norm_key(k)
            if isinstance(v,(dict,list)):
                out[nk]=scalar(v)
                out.update(flatten_obj(v,nk))
            else: out[nk]=scalar(v)
    elif isinstance(obj,list):
        for i,v in enumerate(obj):
            nk=f"{prefix}_{i}" if prefix else str(i)
            if isinstance(v,(dict,list)): out.update(flatten_obj(v,nk))
            else: out[nk]=scalar(v)
    return out

def xml_record(el):
    rec={}
    for k,v in el.attrib.items(): rec[norm_key(k)] = clean_text(v)
    for child in list(el):
        tag=norm_key(child.tag.split("}")[-1])
        txt=clean_text(" ".join(child.itertext()))
        if txt: rec[tag]=txt
        if len(child): 
            for k,v in child.attrib.items(): rec[f"{tag}_{norm_key(k)}"]=clean_text(v)
    txt=clean_text(el.text)
    if txt and not rec: rec["text"]=txt
    return rec

def parse_xml(raw):
    root=ET.fromstring(raw)
    children=list(root)
    # Prefer a repeated child structure as records.
    if children:
        counts=Counter(norm_key(c.tag.split("}")[-1]) for c in children)
        common_tag, common_n = counts.most_common(1)[0]
        if common_n >= 2:
            return [xml_record(c) for c in children if norm_key(c.tag.split("}")[-1])==common_tag]
        # Search one level deeper for repeated records.
        for parent in children:
            pcs=list(parent)
            if len(pcs)>=2:
                tags=Counter(norm_key(c.tag.split("}")[-1]) for c in pcs)
                tag,n=tags.most_common(1)[0]
                if n>=2:
                    return [xml_record(c) for c in pcs if norm_key(c.tag.split("}")[-1])==tag]
    return [xml_record(root)]

def parse_csv(raw):
    text=raw.decode("utf-8-sig", errors="replace")
    sample=text[:10000]
    try: dialect=csv.Sniffer().sniff(sample)
    except Exception: dialect=csv.excel
    rows=csv.DictReader(io.StringIO(text), dialect=dialect)
    return [{norm_key(k):clean_text(v) for k,v in r.items() if k is not None} for r in rows]

def parse_json(raw):
    obj=json.loads(raw.decode("utf-8-sig", errors="replace"))
    if isinstance(obj,list): items=obj
    elif isinstance(obj,dict):
        # Find the largest list of objects anywhere near the top.
        candidates=[]
        for k,v in obj.items():
            if isinstance(v,list) and (not v or isinstance(v[0],dict)): candidates.append(v)
        items=max(candidates,key=len) if candidates else [obj]
    else: items=[obj]
    return [flatten_obj(x) if isinstance(x,dict) else {"text":scalar(x)} for x in items]

def parse_file(filename, raw):
    ext=os.path.splitext(filename.lower())[1]
    if ext==".xml": return parse_xml(raw)
    if ext in (".csv",".tsv"): return parse_csv(raw)
    if ext==".json": return parse_json(raw)
    # Plain text: one non-empty line per feedback record.
    text=raw.decode("utf-8-sig",errors="replace")
    return [{"text":line.strip()} for line in text.splitlines() if line.strip()]

def choose_field(records, candidates):
    keys=Counter()
    for r in records:
        for k,v in r.items():
            nk=norm_key(k)
            if not v: continue
            if any(c in nk for c in candidates): keys[k]+=1
    return keys.most_common(1)[0][0] if keys else None

def text_field_for(r):
    preferred=["feedback","review","comment","complaint","message","description","text","body","content","issue","response"]
    for p in preferred:
        for k,v in r.items():
            if p in norm_key(k) and len(clean_text(v))>8: return clean_text(v)
    vals=[clean_text(v) for k,v in r.items() if clean_text(v)]
    return max(vals,key=len) if vals else ""

def tokenize(text):
    words=re.findall(r"[a-zA-Z][a-zA-Z0-9']{2,}", text.lower())
    return [w for w in words if w not in STOPWORDS and not w.isdigit()]

def sentiment(text):
    words=set(tokenize(text))
    pos=len(words & POSITIVE); neg=len(words & NEGATIVE)
    if neg>pos and neg>=1: return "Negative", min(0.99, .55 + .08*(neg-pos))
    if pos>neg and pos>=1: return "Positive", min(0.99, .55 + .07*(pos-neg))
    return "Neutral", .50

def is_issue(text):
    low=text.lower()
    return any(x in low for x in ISSUE_HINTS)

def phrase_candidates(texts):
    one=Counter(); two=Counter()
    for t in texts:
        ws=tokenize(t)
        for w in ws: one[w]+=1
        for a,b in zip(ws,ws[1:]):
            if a!=b: two[f"{a} {b}"]+=1
    return one,two

def extract_month(d):
    if not d: return None
    m=re.search(r"(20\d{2})[-/](0?[1-9]|1[0-2])(?:[-/]|\b)",d)
    if m: return f"{m.group(1)}-{int(m.group(2)):02d}"
    return None

def near_duplicate_groups(texts, min_group=2, max_groups=10):
    """Groups feedback that shares the same set of meaningful words but isn't
    worded identically — catches reworded repeats without full duplication."""
    signatures=defaultdict(list)
    for i,t in enumerate(texts):
        if not t: continue
        toks=sorted(set(tokenize(t)))
        if len(toks)<2: continue
        signatures[" ".join(toks)].append(i)
    groups=[]
    for idxs in signatures.values():
        if len(idxs)<min_group: continue
        variant_texts=[texts[i] for i in idxs]
        if len(set(variant_texts))<=1: continue  # identical text = exact duplicate, handled elsewhere
        rep=max(variant_texts,key=len)
        groups.append({"text":rep,"count":len(idxs),"variants":len(set(variant_texts))})
    return sorted(groups,key=lambda x:-x["count"])[:max_groups]

def dedupe_topics(topic_rows):
    """Drops a generic single-word topic when a more specific phrase already
    covers it, and collapses sliding-window phrases pulled from the same
    recurring sentence (e.g. 'wallet balance' / 'balance updating' from one
    repeated complaint) down to their strongest representative, so the list
    reads clean instead of listing near-identical fragments."""
    phrases=[r for r in topic_rows if " " in r["topic"]]

    # Collapse phrases that share the same representative example sentence —
    # they are bigram fragments of one recurring sentence, not distinct topics.
    by_sample={}
    for p in phrases:
        key=p["sample"]
        if not key or key not in by_sample or p["mentions"]>by_sample[key]["mentions"]:
            by_sample[key]=p
    collapsed_phrases={id(p) for p in by_sample.values()}

    kept=[]
    for row in topic_rows:
        term=row["topic"]
        if " " in term:
            if id(row) not in collapsed_phrases:
                continue
        else:
            redundant=any(term in p["topic"].split() and p["mentions"]>=row["mentions"]*0.6 for p in phrases)
            if redundant: continue
        kept.append(row)
    return kept

def analyze(records):
    if not records: return {"error":"No records found."}
    text_key=choose_field(records,["feedback","review","comment","complaint","message","description","text","body","content","issue"])
    user_key=choose_field(records,["user_id","userid","customer_id","customer","user","email","author","name"])
    channel_key=choose_field(records,["channel","source","platform","type","origin"])
    date_key=choose_field(records,["date","time","created","timestamp","submitted","at"])
    texts=[text_field_for(r) for r in records]
    sentiments=[sentiment(t)[0] for t in texts]
    issues=[t for t in texts if is_issue(t)]
    words,phrases=phrase_candidates(texts)

    # Build issue topics from high-frequency meaningful terms and phrases.
    topic_counts=Counter()
    for t in issues:
        ws=tokenize(t)
        unique=set(ws)
        for w in unique: topic_counts[w]+=1
        for p,c in phrase_candidates([t])[1].items():
            if c: topic_counts[p]+=1

    top_terms=[(k,v) for k,v in topic_counts.most_common(80) if v>=2 and len(k)>2][:20]
    topic_rows=[]
    for term,count in top_terms:
        term_words=set(term.split())
        def has_term(t):
            return term_words.issubset(set(tokenize(t)))
        matched=[t for t in issues if has_term(t)]
        rep=matched[0] if matched else ""
        rep_words=set(tokenize(rep)) if rep else set()
        similar=0
        if rep_words:
            for t in matched:
                tw=set(tokenize(t))
                if not tw: continue
                inter=len(rep_words & tw); union=len(rep_words | tw)
                if union and inter/union>=0.55: similar+=1
        topic_rows.append({"topic":term,"mentions":count,"share":round(count/max(1,len(records))*100,1),"users":len(set(
            clean_text(r.get(user_key,"")) for r,t in zip(records,texts) if has_term(t) and user_key and clean_text(r.get(user_key,""))
        )) if user_key else None,"sample":rep[:180],"similar_phrasing":similar})
    # If generic terms dominate, retain distinctive phrase-ish topics.
    topic_rows=sorted(topic_rows,key=lambda x:(x["mentions"],x["share"]),reverse=True)[:18]
    topic_rows=dedupe_topics(topic_rows)[:15]

    # Repeated exact duplicate complaints, plus reworded near-duplicates.
    exact=Counter(re.sub(r"[^a-z0-9 ]","",t.lower()).strip() for t in texts if t)
    repeated=[{"text":k,"count":v} for k,v in exact.most_common(10) if v>1]
    near_dupes=near_duplicate_groups(texts)

    unique_users=set()
    if user_key:
        unique_users={clean_text(r.get(user_key,"")) for r in records if clean_text(r.get(user_key,""))}
    else:
        unique_users={re.sub(r"\W+"," ",t.lower()).strip() for t in texts if t}

    channels=Counter(clean_text(r.get(channel_key,"Unknown")) if channel_key else "Imported data" for r in records)
    sent=Counter(sentiments)

    # Record-level enriched output.
    enriched=[]
    for i,(r,t,s) in enumerate(zip(records,texts,sentiments),1):
        uid=clean_text(r.get(user_key,"")) if user_key else f"Record {i}"
        ch=clean_text(r.get(channel_key,"Imported data")) if channel_key else "Imported data"
        enriched.append({"index":i,"user":uid or f"Record {i}","channel":ch or "Unknown","sentiment":s,"issue":is_issue(t),"text":t,"date":clean_text(r.get(date_key,"")) if date_key else ""})

    # Category hints from issue language.
    categories={
      "Performance":["slow","lag","freeze","crash","performance","timeout"],
      "Reliability / Bugs":["bug","broken","error","failed","failure","wrong","crash"],
      "Usability / UX":["difficult","confusing","hard","stuck","navigation","search"],
      "Missing / Requested capability":["missing","need","needs","want","wanted","request"],
      "Payments / Billing":["payment","billing","charge","refund","invoice"],
      "Access / Login":["login","password","signin","sign in","access","account"],
      "Notifications / Communication":["notification","email","alert","message"],
    }
    cat_counts=Counter()
    for t in issues:
        low=t.lower()
        for cat,terms in categories.items():
            if any(x in low for x in terms): cat_counts[cat]+=1

    date_values=[e["date"] for e in enriched if e["date"]]
    month_counts=Counter()
    for e in enriched:
        mo=extract_month(e["date"])
        if mo: month_counts[mo]+=1
    trend=[{"month":k,"count":v} for k,v in sorted(month_counts.items())] if len(month_counts)>=2 else []

    positive_texts=[t for t,s in zip(texts,sentiments) if s=="Positive"]
    positive_highlights=sorted(set(positive_texts),key=len,reverse=True)[:3]

    return {
      "records":len(records),"unique_users":len(unique_users),"issue_records":len(issues),
      "issue_rate":round(len(issues)/len(records)*100,1),
      "sentiment":dict(sent),"channels":dict(channels),
      "top_issues":topic_rows,"categories":[{"category":k,"count":v,"share":round(v/max(1,len(records))*100,1)} for k,v in cat_counts.most_common()],
      "repeated_feedback":repeated,"near_duplicates":near_dupes,
      "trend":trend,"positive_highlights":positive_highlights,
      "date_field":date_key,"date_values_sample":date_values[:10],
      "detected_fields":{"text":text_key,"user":user_key,"channel":channel_key,"date":date_key},
      "records_preview":enriched[:500],
      "all_records":enriched
    }

def pdf_report(result, filename):
    if not REPORTLAB_OK:
        raise RuntimeError("ReportLab is not installed. Run pip install -r requirements.txt")
    buf=BytesIO()
    doc=SimpleDocTemplate(buf,pagesize=A4,rightMargin=32,leftMargin=32,topMargin=32,bottomMargin=32)
    styles=getSampleStyleSheet()
    title=ParagraphStyle("title",parent=styles["Title"],fontSize=22,leading=26,textColor=colors.HexColor("#10283d"),spaceAfter=8)
    h=ParagraphStyle("h",parent=styles["Heading2"],fontSize=13,leading=16,textColor=colors.HexColor("#174e70"),spaceBefore=14,spaceAfter=7)
    small=ParagraphStyle("small",parent=styles["BodyText"],fontSize=8,leading=11,textColor=colors.HexColor("#4c6172"))
    story=[Paragraph("Feedback Intelligence Report",title),
           Paragraph(f"<b>Source:</b> {filename}<br/><b>Generated:</b> {datetime.now().strftime('%d %b %Y, %H:%M')}",small),Spacer(1,10)]
    kpis=[["Metric","Value"],["Total feedback",str(result["records"])],["Unique users",str(result["unique_users"])],
          ["Issue-bearing feedback",f'{result["issue_records"]} ({result["issue_rate"]}%)'],
          ["Positive",str(result["sentiment"].get("Positive",0))],["Neutral",str(result["sentiment"].get("Neutral",0))],["Negative",str(result["sentiment"].get("Negative",0))]]
    tb=Table(kpis,colWidths=[230,230]);tb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#174e70")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("GRID",(0,0),(-1,-1),.35,colors.HexColor("#d7e1e8")),("FONTSIZE",(0,0),(-1,-1),8),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#f5f8fa")]),("PADDING",(0,0),(-1,-1),7)]));story += [tb]
    story += [Paragraph("Top Issues / Topics",h)]
    data=[["Topic","Mentions","Share","Example"]]+[[x["topic"],str(x["mentions"]),f'{x["share"]}%',x["sample"][:85]] for x in result["top_issues"]]
    tb=Table(data,colWidths=[115,55,55,245],repeatRows=1);tb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#174e70")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.3,colors.HexColor("#d7e1e8")),("FONTSIZE",(0,0),(-1,-1),7),("VALIGN",(0,0),(-1,-1),"TOP"),("PADDING",(0,0),(-1,-1),5)]));story += [tb]
    story += [Paragraph("Issue Categories",h)]
    cats=[["Category","Count","Share"]]+[[x["category"],str(x["count"]),f'{x["share"]}%'] for x in result["categories"]]
    tb=Table(cats,colWidths=[260,80,80],repeatRows=1);tb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#174e70")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.3,colors.HexColor("#d7e1e8")),("FONTSIZE",(0,0),(-1,-1),8),("PADDING",(0,0),(-1,-1),5)]));story += [tb]
    story += [Paragraph("Channel Distribution",h)]
    ch=[["Channel","Feedback"]]+[[k,str(v)] for k,v in result["channels"].items()]
    tb=Table(ch,colWidths=[260,80],repeatRows=1);tb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#174e70")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.3,colors.HexColor("#d7e1e8")),("FONTSIZE",(0,0),(-1,-1),8),("PADDING",(0,0),(-1,-1),5)]));story += [tb]
    if result.get("trend"):
        story += [Paragraph("Feedback Volume Over Time",h)]
        tr=[["Month","Feedback count"]]+[[x["month"],str(x["count"])] for x in result["trend"]]
        tb=Table(tr,colWidths=[230,230],repeatRows=1);tb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#174e70")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.3,colors.HexColor("#d7e1e8")),("FONTSIZE",(0,0),(-1,-1),8),("PADDING",(0,0),(-1,-1),5)]));story += [tb]
    story += [Paragraph("Repeated Feedback (exact duplicates)",h)]
    rep=result["repeated_feedback"]
    if rep:
        for x in rep: story.append(Paragraph(f'<b>{x["count"]}×</b> — {x["text"][:250]}',small))
    else: story.append(Paragraph("No exact duplicate feedback detected.",small))
    near=result.get("near_duplicates") or []
    if near:
        story += [Spacer(1,8),Paragraph("Reworded / Near-duplicate Feedback",h)]
        for x in near: story.append(Paragraph(f'<b>{x["count"]}×</b> similar wording (e.g. — {x["text"][:220]})',small))
    pos=result.get("positive_highlights") or []
    if pos:
        story += [Spacer(1,8),Paragraph("Positive Highlights",h)]
        for t in pos: story.append(Paragraph(f'"{t[:220]}"',small))
    story += [PageBreak(),Paragraph("Record-Level Analysis",h)]
    rows=[["#","User","Channel","Sentiment","Issue","Feedback"]]
    for r in result["all_records"][:250]:
        rows.append([str(r["index"]),r["user"][:24],r["channel"][:18],r["sentiment"],"Yes" if r["issue"] else "No",r["text"][:100]])
    tb=Table(rows,colWidths=[22,75,70,55,35,235],repeatRows=1)
    tb.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#174e70")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.25,colors.HexColor("#d7e1e8")),("FONTSIZE",(0,0),(-1,-1),6.5),("VALIGN",(0,0),(-1,-1),"TOP"),("PADDING",(0,0),(-1,-1),4)]))
    story.append(tb)
    doc.build(story);buf.seek(0);return buf

@app.route("/")
def index():
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return render_template("index.html")

@app.route("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(os.path.join(FRONTEND_DIST, "assets"), filename)

@app.post("/api/analyze")
def api_analyze():
    f=request.files.get("file")
    if not f or not f.filename: return jsonify({"error":"Please upload an XML, CSV, JSON, TSV or TXT file."}),400
    try:
        raw=f.read()
        records=parse_file(f.filename,raw)
        result=analyze(records)
        result["filename"]=secure_filename(f.filename)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error":f"Could not analyze file: {e}"}),400

@app.post("/api/report")
def api_report():
    payload=request.get_json(silent=True) or {}
    result=payload.get("result")
    filename=payload.get("filename","feedback-data")
    if not result: return jsonify({"error":"No analysis result available."}),400
    try:
        pdf=pdf_report(result,filename)
        return send_file(pdf,mimetype="application/pdf",as_attachment=True,download_name="feedback-intelligence-report.pdf")
    except Exception as e:
        return jsonify({"error":str(e)}),500

if __name__=="__main__":
    print("\nFeedback Analyzer running at http://127.0.0.1:5050\n")
    app.run(host="127.0.0.1",port=5050,debug=False)
