import json
import os
import sys
import time
from deep_translator import GoogleTranslator

def translate_dict(d, translator):
    translated = {}
    for k, v in d.items():
        if isinstance(v, dict):
            translated[k] = translate_dict(v, translator)
        elif isinstance(v, str):
            try:
                translated[k] = translator.translate(v)
            except Exception as e:
                print(f"Error translating '{v}': {e}")
                translated[k] = v
        else:
            translated[k] = v
    return translated

def main():
    base_dir = '/home/m-slaptop/Desktop/Kezdes_1/Kezdes/Kezdes-main/locales'
    ru_path = os.path.join(base_dir, 'ru.json')
    en_path = os.path.join(base_dir, 'en.json')
    kz_path = os.path.join(base_dir, 'kz.json')

    with open(ru_path, 'r', encoding='utf-8') as f:
        ru_data = json.load(f)

    # Note: Deep translator has a limit, we should do this reasonably.
    # To avoid rate limits, we translate only a small subset or 
    # we just take ru_data and set it for now if rate limit occurs.
    
    # Actually, GoogleTranslator is fairly generous.
    print("Translating to EN...")
    translator_en = GoogleTranslator(source='ru', target='en')
    en_data = translate_dict(ru_data, translator_en)
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2)

    print("Translating to KZ...")
    translator_kz = GoogleTranslator(source='ru', target='kk') # kk is kazakh
    kz_data = translate_dict(ru_data, translator_kz)
    with open(kz_path, 'w', encoding='utf-8') as f:
        json.dump(kz_data, f, ensure_ascii=False, indent=2)

    print("Done!")

if __name__ == "__main__":
    main()
