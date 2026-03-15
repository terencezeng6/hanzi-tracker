from bs4 import BeautifulSoup

with open("hanzicraft_page.html", "r", encoding="utf-8") as f:
  soup = BeautifulSoup(f, "lxml")

characters = []

for a in soup.select("li.list a"):
  characters.append(a.text.strip())