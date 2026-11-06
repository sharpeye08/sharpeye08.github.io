/* Pixel-art icons for the cartridge labels and title screens.
   Two-tone style: ink "#1d1a24" (k) outlines and interior detail, cream "#f6f0e2" (c) fills,
   at most one small accent group (a). Rows are strings, "." = transparent. */
window.PIXEL_ICONS = {
  // Work (experience): briefcase with an ink band and clasp. Label bg: lilac #c3b1f0
  work: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      "................",
      ".....kkkkkk.....",
      ".....k....k.....",
      "..kkkkkkkkkkkk..",
      ".kcccccccccccck.",
      ".kcccccccccccck.",
      ".kcccckkkkcccck.",
      ".kkkkkkcckkkkkk.",
      ".kcccckkkkcccck.",
      ".kcccccccccccck.",
      ".kcccccccccccck.",
      ".kcccccccccccck.",
      "..kkkkkkkkkkkk..",
      "................",
      "................"
    ]
  },

  // Projects: a folder with </> on its front. Label bg: amber #f2b544
  projects: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      "................",
      ".kkkkk..........",
      ".kccck..........",
      ".kccckkkkkkkkkk.",
      ".kcccccccccccck.",
      ".kkkkkkkkkkkkkk.",
      ".kcccccccccccck.",
      ".kcckccckckccck.",
      ".kckccckccckcck.",
      ".kcckckccckccck.",
      ".kcccccccccccck.",
      ".kcccccccccccck.",
      ".kkkkkkkkkkkkkk.",
      "................",
      "................"
    ]
  },

  // Blog: a written page with a folded corner. Label bg: sky #79bff0
  blog: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      "..kkkkkkkkk.....",
      "..kccccccckk....",
      "..kccccccckck...",
      "..kccccccckcck..",
      "..kccccccckkkk..",
      "..kcccccccccck..",
      "..kckkkkkkkcck..",
      "..kcccccccccck..",
      "..kckkkkkkkkck..",
      "..kcccccccccck..",
      "..kckkkkkcccck..",
      "..kcccccccccck..",
      "..kkkkkkkkkkkk..",
      "................",
      "................"
    ]
  },

  // Anzen (road safety): triangular warning sign with "!". Label bg: amber #f2b544
  anzen: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      "................",
      ".......kk.......",
      "......kcck......",
      "......kcck......",
      ".....kckkck.....",
      ".....kckkck.....",
      "....kcckkcck....",
      "....kcckkcck....",
      "...kccckkccck...",
      "...kcccccccck...",
      "..kcccckkcccck..",
      "..kcccckkcccck..",
      ".kcccccccccccck.",
      ".kkkkkkkkkkkkkk.",
      "................"
    ]
  },

  // Kenkyu (AI research agent): magnifying glass reading the lines of a page. Label bg: sky #79bff0
  kenkyu: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      ".....kkkk.......",
      "...kkkkkkkk.....",
      "..kkkcccckkk....",
      "..kkcccccckk....",
      ".kkckkkkkkckk...",
      ".kkcccccccckk...",
      ".kkckkkkkkckk...",
      ".kkcccccccckk...",
      "..kkckkkcckk....",
      "..kkkcccckkk....",
      "...kkkkkkkkk....",
      ".....kkkk..kkk..",
      "............kkk.",
      ".............kk.",
      "................"
    ]
  },

  // Sharpner (AutoML): app window with a rising bar chart. Label bg: coral #ee6c5f
  sharpner: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      "................",
      "..kkkkkkkkkkkk..",
      ".kkckckckkkkkkk.",
      ".kkkkkkkkkkkkkk.",
      ".kcccccccccccck.",
      ".kcccccccckkcck.",
      ".kcccccccckkcck.",
      ".kccccckkckkcck.",
      ".kccccckkckkcck.",
      ".kcckkckkckkcck.",
      ".kcckkckkckkcck.",
      ".kcccccccccccck.",
      ".kkkkkkkkkkkkkk.",
      "................",
      "................"
    ]
  },

  // Lab (experiments): Erlenmeyer flask, ink liquid with cream bubbles. Label bg: paper #efe6d2
  lab: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      ".....kkkkkk.....",
      "......kcck......",
      "......kcck......",
      "......kcck......",
      ".....kcccck.....",
      ".....kcccck.....",
      "....kcccccck....",
      "....kcccccck....",
      "...kkkkkkkkkk...",
      "...kkkkkkckkk...",
      "..kkkkkkkkkkkk..",
      "..kkkkcckkkkkk..",
      ".kkkkkcckkkkkkk.",
      ".kkkkkkkkkkkkkk.",
      "................"
    ]
  },

  // Activity (GitHub): 4x4 contribution grid, ink = active day, cream = quiet day. Label bg: rose #ec8fb2
  activity: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "ccc.kkk.ccc.ccc.",
      "ccc.kkk.ccc.ccc.",
      "ccc.kkk.ccc.ccc.",
      "................",
      "kkk.kkk.ccc.kkk.",
      "kkk.kkk.ccc.kkk.",
      "kkk.kkk.ccc.kkk.",
      "................",
      "ccc.kkk.kkk.kkk.",
      "ccc.kkk.kkk.kkk.",
      "ccc.kkk.kkk.kkk.",
      "................",
      "kkk.ccc.kkk.ccc.",
      "kkk.ccc.kkk.ccc.",
      "kkk.ccc.kkk.ccc.",
      "................"
    ]
  },

  // Mail (contact): envelope with a solid ink flap. Label bg: peach #f6a77a
  mail: {
    palette: { k: "#1d1a24", c: "#f6f0e2" },
    rows: [
      "................",
      "................",
      "................",
      ".kkkkkkkkkkkkkk.",
      ".kkkkkkkkkkkkkk.",
      ".kckkkkkkkkkkck.",
      ".kcckkkkkkkkcck.",
      ".kccckkkkkkccck.",
      ".kcccckkkkcccck.",
      ".kccccckkccccck.",
      ".kcccccccccccck.",
      ".kcccccccccccck.",
      ".kkkkkkkkkkkkkk.",
      "................",
      "................",
      "................"
    ]
  },

  // Mascot for the "no cartridge" screen (20x20), amber eyes are the one accent. Bg: dark screen
  robot: {
    palette: { k: "#1d1a24", c: "#f6f0e2", a: "#ffb454" },
    rows: [
      "....................",
      "........kkkk........",
      ".......kcccck.......",
      ".......kcccck.......",
      "........kcck........",
      "....kkkkkcckkkkk....",
      "...kcccccccccccck...",
      "...kcckkkkkkkkcck...",
      "..kkckkaakkaakkckk..",
      ".kckckkaakkaakkckck.",
      ".kckckkkkkkkkkkckck.",
      "..kkckkkkcckkkkckk..",
      "...kcckkkkkkkkcck...",
      "...kcccccccccccck...",
      "....kkkkkkkkkkkk....",
      "...kkkcccccccckkk...",
      "..kcccccckkcccccck..",
      "...kkkcccccccckkk...",
      ".....kkkkkkkkkk.....",
      "...................."
    ]
  },

  // Second idle frame: blink (eyes squeeze to a line).
  robot2: {
    palette: { k: "#1d1a24", c: "#f6f0e2", a: "#ffb454" },
    rows: [
      "....................",
      "........kkkk........",
      ".......kcccck.......",
      ".......kcccck.......",
      "........kcck........",
      "....kkkkkcckkkkk....",
      "...kcccccccccccck...",
      "...kcckkkkkkkkcck...",
      "..kkckkkkkkkkkkckk..",
      ".kckckkaakkaakkckck.",
      ".kckckkkkkkkkkkckck.",
      "..kkckkkkcckkkkckk..",
      "...kcckkkkkkkkcck...",
      "...kcccccccccccck...",
      "....kkkkkkkkkkkk....",
      "...kkkcccccccckkk...",
      "..kcccccckkcccccck..",
      "...kkkcccccccckkk...",
      ".....kkkkkkkkkk.....",
      "...................."
    ]
  }
};

// Returns an SVG string for the icon, or "" for an unknown name.
// Consecutive same-color pixels in a row are merged into one <rect>.
window.pixelSVG = function (name) {
  try {
    var icons = window.PIXEL_ICONS;
    if (!icons || !Object.prototype.hasOwnProperty.call(icons, name)) return "";
    var icon = icons[name], rows = icon.rows, pal = icon.palette;
    var h = rows.length, w = 0, body = "";
    for (var y = 0; y < h; y++) {
      var row = rows[y];
      if (row.length > w) w = row.length;
      var x = 0;
      while (x < row.length) {
        var c = row.charAt(x), x0 = x;
        while (x < row.length && row.charAt(x) === c) x++;
        if (c !== "." && Object.prototype.hasOwnProperty.call(pal, c)) {
          body += '<rect x="' + x0 + '" y="' + y + '" width="' + (x - x0) + '" height="1" fill="' + pal[c] + '"/>';
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h +
      '" shape-rendering="crispEdges" aria-hidden="true">' + body + "</svg>";
  } catch (e) {
    return "";
  }
};
