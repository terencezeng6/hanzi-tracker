import requests
from bs4 import BeautifulSoup
import json
from collections import defaultdict

base_url = "http://hanzidb.org/character-list/general-standard?page="

characters = []
frequency_rank = defaultdict(int)

for page in range(1, 83):
  url = base_url + str(page)

  response = requests.get(url)
  response.encoding = 'utf-8'

  if response.status_code == 200:
    print(f"Success! Fetched page {page}")
    
    soup = BeautifulSoup(response.text, 'html.parser')

    for row in soup.find_all('tr')[1:]:
      tds = row.find_all('td')
      if tds:
        character = tds[0].text.strip()
        rank = 9999
        try:
          rank = int(tds[-1].text.strip())
        except ValueError:
          pass
        frequency_rank[character] = rank
        characters.append((character, rank))

  else:
    print(f"Failed to fetch page {page}")
    print(f"Status code: {response.status_code}")

characters.sort(key=lambda x: x[1])
print(f"{len(characters)} characters in total.")
print(characters)

# new_rank = defaultdict(int)
# for i, (character, rank) in enumerate(characters):
#   new_rank[character] = i + 1

# print(new_rank)

with open("characters.js", "w", encoding="utf-8") as f:
  f.write("const characters = ")
  json.dump([char for char, rank in characters], f, ensure_ascii=False)
  f.write(";")