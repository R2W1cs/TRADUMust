import sqlite3
import uuid
import json
from datetime import datetime, timedelta
import random

DB_PATH = "../api/storage/tradumust.sqlite"

base_phrases = [
    # Academic
    ("I have a question about the lecture.", "ACADEMIC", "I HAVE QUESTION LECTURE", "formal", "Respectful inquiry for professor"),
    ("When is the assignment due?", "ACADEMIC", "WHEN ASSIGNMENT DUE", "neutral", "Standard question for deadlines"),
    ("Could you explain that concept again?", "ACADEMIC", "PLEASE EXPLAIN CONCEPT AGAIN", "formal", "Asking for clarification"),
    ("Where can I find the course syllabus?", "ACADEMIC", "WHERE COURSE SYLLABUS", "neutral", "Seeking class materials"),
    ("I need to schedule office hours.", "ACADEMIC", "I NEED SCHEDULE OFFICE HOURS", "formal", "Setting up a meeting"),
    ("Can we form a study group?", "ACADEMIC", "WE FORM STUDY GROUP CAN", "neutral", "Collaborative learning request"),
    ("What is the format of the final exam?", "ACADEMIC", "WHAT FORMAT FINAL EXAM", "neutral", "Inquiring about exams"),
    ("Is attendance mandatory for this seminar?", "ACADEMIC", "ATTENDANCE MANDATORY SEMINAR", "formal", "Checking course policies"),
    ("I am citing this paper for my research.", "ACADEMIC", "I CITE PAPER MY RESEARCH", "formal", "Discussing academic sources"),
    ("Could you upload the presentation slides?", "ACADEMIC", "PLEASE UPLOAD PRESENTATION SLIDES", "formal", "Requesting lecture materials"),
    
    # Campus Life
    ("Where is the student union building?", "CAMPUS", "WHERE STUDENT UNION", "neutral", "Navigating campus"),
    ("How do I connect to the university wifi?", "CAMPUS", "HOW CONNECT UNIVERSITY WIFI", "neutral", "Tech support question"),
    ("Is the dining hall still open?", "CAMPUS", "DINING HALL STILL OPEN", "neutral", "Food inquiry"),
    ("Where can I get my student ID card?", "CAMPUS", "WHERE GET STUDENT ID", "neutral", "Administrative task"),
    ("What time does the library close today?", "CAMPUS", "WHAT TIME LIBRARY CLOSE TODAY", "neutral", "Library hours"),
    
    # Daily Essentials
    ("Hello, how are you today?", "DAILY", "HELLO HOW YOU TODAY", "neutral", "Common greeting"),
    ("Thank you very much for your help.", "DAILY", "THANK YOU VERY MUCH YOUR HELP", "formal", "Expressing gratitude"),
    ("Excuse me, where is the nearest restroom?", "DAILY", "EXCUSE ME WHERE NEAREST RESTROOM", "neutral", "Finding facilities"),
    ("I would like to order a coffee, please.", "DAILY", "I WANT ORDER COFFEE PLEASE", "neutral", "Ordering a drink"),
    ("How much does this cost?", "DAILY", "HOW MUCH COST THIS", "neutral", "Asking for price"),
    ("Do you accept credit cards?", "DAILY", "YOU ACCEPT CREDIT CARD", "neutral", "Payment inquiry"),
    ("I am lost, can you help me?", "DAILY", "I LOST CAN YOU HELP ME", "neutral", "Asking for directions"),
    ("Have a great day!", "DAILY", "HAVE GREAT DAY", "neutral", "Friendly farewell"),
    ("I don't understand.", "DAILY", "I NOT UNDERSTAND", "neutral", "Expressing confusion"),
    ("Please speak a bit slower.", "DAILY", "PLEASE SPEAK LITTLE SLOW", "formal", "Asking to slow down"),
    
    # Sign Language Bridge
    ("I am deaf.", "SIGN", "I DEAF", "neutral", "Stating identity"),
    ("Are you learning sign language?", "SIGN", "YOU LEARN SIGN LANGUAGE", "neutral", "Asking about ASL learning"),
    ("Please look at me so I can read your lips.", "SIGN", "PLEASE LOOK ME FOR LIP READ", "neutral", "Communication request"),
    ("My primary language is ASL.", "SIGN", "MY FIRST LANGUAGE ASL", "neutral", "Language preference"),
    ("Can you type that on your phone?", "SIGN", "CAN YOU TYPE PHONE", "neutral", "Alternative communication"),
    ("The interpreter will be joining us shortly.", "SIGN", "INTERPRETER JOIN US SOON", "formal", "Announcing interpreter"),
    ("Nice to meet you in the SignBridge app.", "SIGN", "NICE MEET YOU SIGNBRIDGE", "neutral", "Intro via app"),
    ("Your signing is very clear.", "SIGN", "YOUR SIGN VERY CLEAR", "neutral", "Complimenting skills"),
    ("What is the sign for this word?", "SIGN", "WHAT SIGN FOR THIS WORD", "neutral", "Asking for vocabulary"),
    ("Let's practice signing together.", "SIGN", "LET PRACTICE SIGN TOGETHER", "neutral", "Study proposal"),
    
    # Health/Shopping
    ("Where is the campus clinic?", "HEALTH", "WHERE CAMPUS CLINIC", "neutral", "Finding health services"),
    ("I need to buy some textbooks.", "SHOPPING", "I NEED BUY TEXTBOOKS", "neutral", "Purchasing books"),
    ("I have an allergy to peanuts.", "HEALTH", "I ALLERGY PEANUTS", "formal", "Dietary restriction"),
    ("Is there a pharmacy nearby?", "HEALTH", "PHARMACY NEARBY IS", "neutral", "Finding medicine"),
    ("Do you have this in a different size?", "SHOPPING", "YOU HAVE THIS DIFFERENT SIZE", "neutral", "Shopping query")
]

langs = [
    ("fr", "French"), ("es", "Spanish"), ("de", "German"), ("ja", "Japanese"), 
    ("zh", "Chinese"), ("ar", "Arabic"), ("pt", "Portuguese"), ("ko", "Korean"), 
    ("it", "Italian"), ("en", "English")
]

def make_translated(text, lang):
    # Dummy translated text for the purpose of seeding 500 quickly. It uses the base text and prepends the lang code.
    return f"[{lang.upper()}] {text}"

# Let's generate 500 total phrases by cross multiplying base phases with languages
entries = []
count = 0

now = datetime.utcnow()

while count < 500:
    for base_text, category, gloss, formality, note in base_phrases:
        if count >= 500:
            break
        
        # Pick a language roughly round-robin
        lang_code, lang_name = langs[count % len(langs)]
        
        entry_id = str(uuid.uuid4())
        
        translated_text = make_translated(base_text, lang_code)
        
        sentiment = {"polarity": random.uniform(-0.1, 0.4), "subjectivity": random.uniform(0.1, 0.9)}
        metadata = [
            {"word": w, "tag": random.choice(["SUBJECT", "ACTION", "OBJECT", "MODIFIER"])} 
            for w in base_text.split()[:4]
        ]
        
        # Give some random repetition spacing
        repetitions = random.randint(0, 4)
        
        extra = {
            "word_sequence": gloss.split(),
            "category": category,
            "srs": {
                "repetitions": repetitions,
                "interval": max(1, repetitions * 2),
                "easiness": 2.5,
                "next_review": int((now + timedelta(days=max(0, repetitions*2 - 1))).timestamp() * 1000)
            }
        }
        
        created_at = (now - timedelta(days=random.randint(0, 30))).isoformat() + "Z"
        
        record = (
            entry_id,
            "translation", # entry_type
            base_text,
            translated_text,
            "en", # source_lang
            lang_code, # target_lang
            "ASL", # sign_language
            f"{note} (in {lang_name} culture)", # cultural_note
            formality, # formality_level
            "Standard", # regional_variant
            json.dumps(sentiment),
            json.dumps(metadata),
            json.dumps(extra),
            1, # is_phrasebook
            created_at
        )
        
        entries.append(record)
        count += 1

print(f"Generated {len(entries)} entries. Inserting into DB...")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Ensure tables exist
with open('../api/database/schema.sql', 'r') as f:
    cursor.executescript(f.read())

cursor.executemany('''
    INSERT INTO history_entries (
        id, entry_type, source_text, translated_text, source_lang, target_lang, sign_language, 
        cultural_note, formality_level, regional_variant, sentiment_json, metadata_json, extra_json, 
        is_phrasebook, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', entries)

conn.commit()
conn.close()

print("Successfully seeded 500 phrases.")
