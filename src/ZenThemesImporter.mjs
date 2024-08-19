
const kZenStylesheetThemeHeader = `
/* Zen Themes - Generated by ZenThemeImporter.
  * DO NOT EDIT THIS FILE DIRECTLY!
  * Your changes will be overwritten.
  * Instead, go to the preferences and edit the themes there.
  */
`;
const kenStylesheetFooter = `
/* End of Zen Themes */
`;
var gZenStylesheetManager = {
  async writeStylesheet(path, themes) {
    let content = kZenStylesheetThemeHeader;
    for (let theme of themes) {
      content += this.getThemeCSS(theme);
    }
    content += kenStylesheetFooter;
    let buffer = new TextEncoder().encode(content);
    await IOUtils.write(path, buffer);
  },

  getThemeCSS(theme) {
    let css = "\n";
    if (theme._readmeURL) {
      css += `/* Name: ${theme.name} */\n`;
      css += `/* Description: ${theme.description} */\n`;
      css += `/* Author: @${theme.author} */\n`;
      css += `/* Readme: ${theme.readme} */\n`;
    }
    css += `@import url("${theme._chromeURL}");\n`;
    return css;
  }
};

var gZenThemeImporter = new class {
  constructor() {
    console.info("ZenThemeImporter: Initiating Zen theme importer");
    try {
      this.insertStylesheet();
      console.info("ZenThemeImporter: Zen theme imported");
    } catch (e) {
      console.error("ZenThemeImporter: Error importing Zen theme: ", e);
    }
    Services.prefs.addObserver("zen.themes.updated-value-observer", this.rebuildThemeStylesheet.bind(this), false);
  }

  get styleSheetPath() {
    return PathUtils.join(
      PathUtils.profileDir,
      "chrome",
      "zen-themes.css"
    );
  }

  get themesRootPath() {
    return PathUtils.join(
      PathUtils.profileDir,
      "chrome",
      "zen-themes"
    );
  }

  get themesDataFile() {
    return PathUtils.join(
      PathUtils.profileDir,
      "zen-themes.json"
    );
  }

  getThemeFolder(theme) {
    return PathUtils.join(this.themesRootPath, theme.id);
  }

  async getThemes() {
    if (!this._themes) {
      if (!(await IOUtils.exists(this.themesDataFile))) {
        await IOUtils.writeJSON(this.themesDataFile, {});
      }
      this._themes = await IOUtils.readJSON(this.themesDataFile);
    }
    return this._themes;
  }

  rebuildThemeStylesheet() {
    this._themes = null;
    this.updateStylesheet();
  }

  get styleSheetURI() {
    if (!this._styleSheetURI) {
      this._styleSheetURI = Services.io.newFileURI(new FileUtils.File(this.styleSheetPath));
    }
    return this._styleSheetURI;
  }

  getStylesheetURIForTheme(theme) {
    return Services.io.newFileURI(new FileUtils.File(PathUtils.join(this.getThemeFolder(theme), "chrome.css")));
  }

  insertStylesheet() {
    if (IOUtils.exists(this.styleSheetPath)) {
      let styleSheet = document.getElementById("zen-themes-stylesheet");
      if (!styleSheet) {
        styleSheet = document.createElementNS("http://www.w3.org/1999/xhtml", "html:link");
        styleSheet.id = "zen-themes-stylesheet";
        styleSheet.setAttribute("rel", "stylesheet");
        styleSheet.setAttribute("type", "text/css");
        styleSheet.setAttribute("href", this.styleSheetURI.spec);
        document.documentElement.appendChild(styleSheet);
      } else {
        // add a ?=timestamp to the URL to force a reload
        styleSheet.href = this.styleSheetURI.spec + "?" + Date.now();
      }
    }
  }

  removeStylesheet() {
    const styleSheet = document.getElementById("zen-themes-stylesheet");
    if (styleSheet) {
      styleSheet.remove();
    }
  }

  async updateStylesheet() {
    this.removeStylesheet();
    await this.writeStylesheet();
    this.insertStylesheet();
  }

  async writeStylesheet() {
    const themes = []
    this._themes = null;
    for (let theme of Object.values(await this.getThemes())) {
      theme._chromeURL = this.getStylesheetURIForTheme(theme).spec;
      themes.push(theme);
    }
    await gZenStylesheetManager.writeStylesheet(this.styleSheetPath, themes);
  }
};
