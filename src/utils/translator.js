export function transliterateEnglishToGujarati(text) {
  if (!text) return "";
  
  // If it doesn't contain any English letters, return as is (already in Gujarati or other script)
  if (!/[a-zA-Z]/.test(text)) {
    return text;
  }

  // Dictionary for exact matching (case-insensitive)
  const dictionary = {
    // Surnames
    "parmar": "પરમાર",
    "solanki": "સોલંકી",
    "vadhriya": "વાઢિયા",
    "chauhan": "ચૌહાણ",
    "rathod": "રાઠોડ",
    "makwana": "મકવાણા",
    "vaghela": "વાઘેલા",
    "patel": "પટેલ",
    "chavda": "ચાવડા",
    "dabhi": "ડાભી",
    "parghee": "પરઘી",
    "parghi": "પરઘી",
    "joshi": "જોશી",
    "shah": "શાહ",
    "mehta": "મહેતા",
    "prajapati": "પ્રજાપતિ",
    "vyas": "વ્યાસ",
    "nayak": "નાયક",
    "thakor": "ઠાકોર",
    "thakorji": "ઠાકોરજી",

    // Names
    "ramesh": "રમેશ",
    "kanji": "કાનજી",
    "manu": "મનુ",
    "nilesh": "નિલેશ",
    "nikul": "નિકુલ",
    "jitendra": "જીતેન્દ્ર",
    "jitu": "જીતુ",
    "rajesh": "રાજેશ",
    "suresh": "સુરેશ",
    "mahesh": "મહેશ",
    "naresh": "નારેશ",
    "dinesh": "દિનેશ",
    "paresh": "પરેશ",
    "haresh": "હરેશ",
    "amit": "અમિત",
    "anil": "અનિલ",
    "sanjay": "સંજય",
    "sandip": "સંદિપ",
    "sandeep": "સંદીપ",
    "vijay": "વિજય",
    "arvind": "અરવિંદ",
    "pravin": "પ્રવિણ",
    "praveen": "પ્રવીણ",
    "kishor": "કિશોર",
    "kishore": "કિશોર",
    "bharat": "ભરત",
    "bhikhaji": "ભીખાજી",
    "babubhai": "બાબુભાઈ",
    "rameshbhai": "રમેશભાઈ",
    "kanjibhai": "કાનજીભાઈ",
    "manubhai": "મનુભાઈ",
    "nikulbhai": "નિકુલભાઈ",
    "harshad": "હર્ષદ",
    "harshadbhai": "હર્ષદભાઈ",
    "dilip": "દિલીપ",
    "dilipbhai": "દિલીપભાઈ",
    "hasmukh": "હસમુખ",
    "hasmukhbhai": "હસમુખભાઈ",
    "jayesh": "જયેશ",
    "jayeshbhai": "જયેશભાઈ",
    "hitesh": "હિતેશ",
    "hiteshbhai": "હિતેશભાઈ",

    // Villages
    "chhapi": "છાપી",
    "chhaapi": "છાપી",
    "palanpur": "પાલનપુર",
    "deesa": "ડીસા",
    "disa": "ડીસા",
    "tharad": "થરાદ",
    "dhanera": "ધાનેરા",
    "radhanpur": "રાધનપુર",
    "patan": "પાટણ",
    "sidhpur": "સિદ્ધપુર",
    "sidhhpur": "સિદ્ધપુર",
    "mehsana": "મહેસાણા",
    "mahesana": "મહેસાણા",
    "ahmedabad": "અમદાવાદ",
    "gandhinagar": "ગાંધીનગર",
    "deodar": "દિયોદર",
    "diyodar": "દિયોદર",
    "bhabhar": "ભાભર",
    "vadanagar": "વડનગર",
    "vadnagar": "વડનગર",
    "unjha": "ઊંઝા",
    "visnagar": "વિસનગર",
    "kheralu": "ખેરાલુ",
    "danta": "દાંતા",
    "vav": "વાવ",
    "kankrej": "કાંકરેજ",
    "suigam": "સુઇગામ",
    "lakhni": "લાખણી",
    "panchshil": "પંચશીલ"
  };

  // Convert to words, translate each word, and join them
  const words = text.split(/\s+/);
  const translatedWords = words.map(word => {
    // Remove punctuation for dictionary check
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    
    // Check exact dictionary match
    if (dictionary[cleanWord]) {
      return dictionary[cleanWord];
    }

    // Check if it ends with common suffixes like 'bhai', 'ben', 'kumar', 'lal'
    if (cleanWord.endsWith('bhai') && cleanWord.length > 4) {
      const stem = cleanWord.slice(0, -4);
      if (dictionary[stem]) {
        return dictionary[stem] + "ભાઈ";
      }
    }
    if (cleanWord.endsWith('ben') && cleanWord.length > 3) {
      const stem = cleanWord.slice(0, -3);
      if (dictionary[stem]) {
        return dictionary[stem] + "બેન";
      }
    }
    if (cleanWord.endsWith('kumar') && cleanWord.length > 5) {
      const stem = cleanWord.slice(0, -5);
      if (dictionary[stem]) {
        return dictionary[stem] + "કુમાર";
      }
    }

    // Fallback: rule-based phonetic transliteration
    return phoneticTransliteration(cleanWord);
  });

  return translatedWords.join(" ");
}

function phoneticTransliteration(word) {
  if (!word) return "";
  
  let gujarati = "";
  let i = 0;
  
  const rules = [
    // Consonant clusters (longer matches first)
    { eng: "chh", guj: "છ" },
    { eng: "kh", guj: "ખ" },
    { eng: "gh", guj: "ઘ" },
    { eng: "ch", guj: "ચ" },
    { eng: "jh", guj: "ઝ" },
    { eng: "zh", guj: "ઝ" },
    { eng: "th", guj: "થ" },
    { eng: "dh", guj: "ધ" },
    { eng: "bh", guj: "ભ" },
    { eng: "sh", guj: "શ" },
    { eng: "ph", guj: "ફ" },
    
    // Single consonants
    { eng: "b", guj: "બ" },
    { eng: "c", guj: "ક" },
    { eng: "d", guj: "દ" },
    { eng: "f", guj: "ફ" },
    { eng: "g", guj: "ગ" },
    { eng: "h", guj: "હ" },
    { eng: "j", guj: "જ" },
    { eng: "k", guj: "ક" },
    { eng: "l", guj: "લ" },
    { eng: "m", guj: "મ" },
    { eng: "n", guj: "ન" },
    { eng: "p", guj: "પ" },
    { eng: "r", guj: "ર" },
    { eng: "s", guj: "સ" },
    { eng: "t", guj: "ત" },
    { eng: "v", guj: "વ" },
    { eng: "w", guj: "વ" },
    { eng: "y", guj: "ય" },
    { eng: "z", guj: "ઝ" },
    
    // Vowels mapping (matras)
    { eng: "aa", guj: "ા" },
    { eng: "ee", guj: "ી" },
    { eng: "oo", guj: "ૂ" },
    { eng: "ai", guj: "ૈ" },
    { eng: "au", guj: "ૌ" },
    { eng: "a", guj: "" },
    { eng: "i", guj: "િ" },
    { eng: "u", guj: "ુ" },
    { eng: "e", guj: "ે" },
    { eng: "o", guj: "ો" }
  ];

  while (i < word.length) {
    let matched = false;
    
    // Try matching rules
    for (const rule of rules) {
      const len = rule.eng.length;
      if (word.substring(i, i + len) === rule.eng) {
        const isVowel = ["aa", "ee", "oo", "ai", "au", "a", "i", "u", "e", "o"].includes(rule.eng);
        
        if (isVowel) {
          if (gujarati.length === 0) {
            // Independent vowels
            const independentVowels = {
              "a": "અ",
              "aa": "આ",
              "i": "ઇ",
              "ee": "ઈ",
              "u": "ઉ",
              "oo": "ઊ",
              "e": "એ",
              "ai": "ઐ",
              "o": "ઓ",
              "au": "ઔ"
            };
            gujarati += independentVowels[rule.eng] || "અ";
          } else {
            // Append vowel sign (matra)
            gujarati += rule.guj;
          }
        } else {
          // It's a consonant
          if (gujarati.length > 0 && word[i] === word[i - 1] && word[i] !== 'h') {
            // If double letter like 'pp', skip doubling translation
          } else {
            gujarati += rule.guj;
          }
        }
        
        i += len;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      i++;
    }
  }
  
  return gujarati;
}
