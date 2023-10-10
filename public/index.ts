import "@logseq/libs"
import {highlighTagRef, unHighlightTag, highlightLinkRef, unHighlightRef} from './highlightLinked'

const doc = parent.document
const highlightClass = "unlink-highlight"

async function getPageNames() {
  const page = await logseq.Editor.getCurrentPage()
  if(!page){
    return
  }
  let pageNames = [page.name]
  if (page.alias) {
    for(const alias of page.alias){
      const aliasPage = await logseq.Editor.getPage(alias.id)
      pageNames.push(aliasPage.name)
    }
  }

  // return lowercase page names, and sort by page length
  return pageNames.sort((a, b) => b.length - a.length).map((name) => name.toLowerCase())
}

let prePageNames = []
async function highlightLinked() {
  const curPageNames = await getPageNames()
  if(!curPageNames){
    return
  }
  // references
  if (logseq.settings.highlightLinkedRefs) {
    highlightLinkRef(prePageNames, curPageNames)
  } else {
    unHighlightRef(prePageNames)
  }

  // tags
  // if (logseq.settings.highlightLinkedTags) {
  //   highlighTagRef(prePageNames, curPageNames)
  // } else {
  //   unHighlightTag(prePageNames)
  // }

  prePageNames = curPageNames
}


logseq.useSettingsSchema([
  {
    key: "highlightColor",
    title: "Highlight Color",
    type: "string",
    default: "yellow", // default to false
    description: "",
  },
  {
    key: "highlightColorDarkMode",
    title: "Highlight Color in Dark Mode",
    type: "string",
    default: "#ffff0030",
    description: "",
  },
  {
    key: "highlightLinkedRefs",
    title: "Whether to highlight references in linked references",
    type: "boolean",
    default: false, // default to false
    description: "",
  },
  // {
  //   key: "highlightLinkedTags",
  //   title: "Whether to highlight tag in linked references",
  //   type: "boolean",
  //   default: false, // default to false
  //   description: "",
  // },
])

function provideStyle() {
  logseq.provideStyle(`
  button.link-button, button.link-all-button {
    float: right;
    padding-left: 5px;
    padding-right: 5px;
    border: 1px solid var(--ls-border-color);
    border-radius: 4px;
    opacity: 0.6;
    transition: .3s;
  }
  button.link-button:hover, button.link-all-button:hover {
    opacity: 1;
  }
  button.link-button::before, button.link-all-button::before {
    content: "\\eade";
    width: 16px;
    height: 16px;
    margin-right: 4px;
    display: inline-block;
    line-height: 1em;
    font-family: tabler-icons;
  }
  button.link-all-button {
    margin-left: auto;
  }
  span.${highlightClass} {
    background-color: ${logseq.settings.highlightColor};
  }
  .dark span.${highlightClass} {
    background-color: ${logseq.settings.highlightColorDarkMode};
  }
  `)
}

async function main() {
  provideStyle()

  logseq.onSettingsChanged(async () => {
    provideStyle()
    await highlightLinked()
  })

  logseq.App.onRouteChanged(() => {
    setTimeout(async () => {
      if(logseq.settings.highlightLinkedRefs){
        await highlightLinked()
      }
    addLinkAllButton()
    }, 100)
  })


  let unlinkObserver, unlinkedRefsContainer

  const unlinkCallback = function (mutationsList, observer) {
    for (let i = 0; i < mutationsList.length; i++) {
      const addedNode = mutationsList[i].addedNodes[0]
      if (addedNode && addedNode.childNodes.length) {
        const blocks = addedNode.querySelectorAll(".block-content")
        if (blocks.length) {
          unlinkObserver.disconnect()
          for (let i = 0; i < blocks.length; i++) {
            addHighlight(blocks[i])
          }
          unlinkObserver.observe(unlinkedRefsContainer, obConfig)
        }
      }
    }
  }

  const obConfig = {
    childList: true,
    subtree: true,
  }
  unlinkObserver = new MutationObserver(unlinkCallback)

  function addObserverIfDesiredNodeAvailable() {
    unlinkedRefsContainer = doc.querySelector(".page-unlinked.references")
    if (!unlinkedRefsContainer) {
      setTimeout(addObserverIfDesiredNodeAvailable, 200)
      return
    }
    unlinkObserver.observe(unlinkedRefsContainer, obConfig)
  }
  addObserverIfDesiredNodeAvailable()

  logseq.App.onRouteChanged(() => {
    setTimeout(() => {
      addObserverIfDesiredNodeAvailable()
    }, 50) // wait for page load, otherwise would observer the previous page
  })

  logseq.beforeunload(async () => {
    unlinkObserver.disconnect()
  })
}


function addLinkAllButton() {
  let linkAllButton = doc.createElement("button");
  linkAllButton.setAttribute("class", "link-all-button");
  linkAllButton.innerHTML = "Link All";
  linkAllButton.style.display = "none"
  linkAllButton.addEventListener("click", (e) => {
    e.stopImmediatePropagation();
    const allUnlinkedButtons = doc.querySelectorAll(".link-button");
    allUnlinkedButtons.forEach((button) => {
      button.click();
    });
  });
  // 🌟 Create a span element
  let wrapperSpan = doc.createElement("span");
  
  // 🌟 Append the button to the span
  wrapperSpan.appendChild(linkAllButton);

  // linkAllButton.addEventListener("click", linkAll);
  let unLinkTitle = doc.querySelector(".references.page-unlinked > .content > .flex > .content")
  if (unLinkTitle) {
    unLinkTitle.insertBefore(wrapperSpan, unLinkTitle.firstChild);
    unLinkTitle.addEventListener("click", (e) => {
      let extended = unLinkTitle.nextElementSibling

      setTimeout(() => {
        if(extended.className == "hidden"){
          linkAllButton.style.display = "none"
          return
        } 
        if(!doc.querySelector(".link-button")) {
          console.log("no link button")
          return
        }

        linkAllButton.style.display = "inline-block"
      }, 50);

    });
  }
}

const contentSelector = ".inline, .is-paragraph, h1, h2, h3, h4, h5, h6"
function addButton(blockEl, pageNames) {

  let linkButton = blockEl.querySelector(".link-button")
  if (linkButton) {
    return
  }
  const blockID = blockEl.getAttribute("blockid")
  linkButton = doc.createElement("button")
  linkButton.setAttribute("class", "link-button")
  linkButton.innerHTML = "link"
  linkButton.addEventListener("click", async (e) => {
    const block = await logseq.Editor.getBlock(blockID)
    const content = block.content
    const reStr = "(" + pageNames.join("|") + ")"
    const re = new RegExp(reStr, "ig")

    /*
       page = cu
      'cu #focus #f/ocus #cu cus focus [[cu]] [[focus]]'
      '[[cu]] #focus #f/ocus #cu [[cu]]s fo[[cu]]s [[cu]] [[focus]]'
    */
    const newContent = content.replace(re, (match, _, i) => {
      while (i >= 0) {
        if (/\s/.test(content[i]) || content[i] === "]") {
          break
        } else if (content[i] == "[" || content[i] == "#") {
          return match
        }
        i -= 1
      }

      return `[[${match}]]`
    })
    console.log("unlinked content: ", content, pageNames)
    console.log("linked content: ", newContent)

    // sometimes header and paragraph would cause block render error
    // so we need to step into edit mode first, and exit after 100ms
    await logseq.Editor.editBlock(blockID)
    await logseq.Editor.updateBlock(blockID, newContent)

    setTimeout(() => {
      logseq.Editor.exitEditingMode()
    }, 100);

    let highlights = blockEl.querySelectorAll(`.${highlightClass}`)
    for (let i = 0; i < highlights.length; i++) {
      // highlights[i].style.display = 'none'
      highlights[i].remove()
    }
    linkButton.style.display = "none"
  })

  blockEl.querySelector(contentSelector).appendChild(linkButton)
}

async function addHighlight(blockEl) {
  const contentElements = blockEl.querySelectorAll(contentSelector)
  const pageNames = await getPageNames()
  const reStr = "(" + pageNames.join("|") + ")"
  const re = new RegExp(reStr, "ig")

  contentElements.forEach((content) => {
    let child = content.firstChild
    let pureText = [] // pure text in first level of inline
    let formatText = [] // bold, italic, mark text in second level of inline

    while (child) {
      if (child.nodeType == 3) {
        pureText.push(child)
      }

      if (["B", "I", "EM", "STRONG", "MARK", "DEL"].includes(child.tagName)) {
        formatText.push({
          parent: child,
          children: [],
        })
      }

      child = child.nextSibling
    }

    for (let i = 0; i < formatText.length; i++) {
      child = formatText[i]["parent"].firstChild
      while (child) {
        if (child.nodeType == 3) {
          formatText[i]["children"].push(child)
        }
        child = child.nextSibling
      }
    }

    function newHighlightNode(child) {
      const text = child.textContent
      if (re.test(text)) {
        // const isPureText = content.tagName == "SPAN"
        addButton(blockEl, pageNames)
      }
      let domText = text.replace(
        re,
        `<span class="${highlightClass}">$1</span>`,
      )
      let newDom = document.createElement("span")
      newDom.innerHTML = domText
      return newDom
    }

    pureText.forEach((child) => {
      content.replaceChild(newHighlightNode(child), child)
    })

    formatText.forEach((boldNode) => {
      boldNode["children"].forEach((c) => {
        boldNode["parent"].replaceChild(newHighlightNode(c), c)
      })
    })
  })
}

logseq.ready(main).catch(console.error)
