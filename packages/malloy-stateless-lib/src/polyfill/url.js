class URL {
  constructor(url, base) {
    if(base) {
      this.url = `${base}/${url}`;
    } else {
      this.url = url;
    }
  }

  toString() {
    return this.url;
  }
}

module.exports = {
  URL
}