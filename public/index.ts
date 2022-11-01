import "@logseq/libs"

const doc = parent.document
const highlightClass = 'unlink-highlight'

async function getPageNames() {
  const page = await logseq.Editor.getCurrentPage()
  let pageNames = [page.name]
  if(page.properties && page.properties['alias']) {
    pageNames = pageNames.concat(page.properties['alias'])
  }

  return pageNames
}

async function main() {
  logseq.provideStyle(`
  button.link-button {
    float: right;
    padding-left: 5px;
    padding-right: 5px;
    border: 1px solid var(--ls-border-color);
    border-radius: 4px;
    opacity: 0.6;
    transition: .3s;
  }
  button.link-button:hover {
    opacity: 1;
  }
  button.link-button::before {
    content: "\\eade";
    width: 16px;
    height: 16px;
    margin-right: 4px;
    display: inline-block;
    line-height: 1em;
    font-family: tabler-icons;
  }

    span.${highlightClass} {
      background-color: yellow;
    }

  `)

  let unlinkObserver, unlinkedRefsContainer;

  const unlinkCallback = function (mutationsList, observer) {
    for (let i = 0; i < mutationsList.length; i++) {
      const addedNode = mutationsList[i].addedNodes[0];
      if (addedNode && addedNode.childNodes.length) {
        const blocks = addedNode.querySelectorAll('.block-content')
        if (blocks.length) {
          unlinkObserver.disconnect()
          for (let i=0; i < blocks.length; i++) {
            addHighlight(blocks[i])
          }
          unlinkObserver.observe(unlinkedRefsContainer, obConfig);
        }
      }
    }
  };

  const showUnlinkTimeout = 500

  const obConfig = {
    childList: true,
    subtree: true,
  };
  unlinkObserver = new MutationObserver(unlinkCallback);

  function addObserverIfDesiredNodeAvailable() {
    unlinkedRefsContainer = doc.querySelector(".page>div:nth-last-child(1) .references");
    if(!unlinkedRefsContainer) {
        setTimeout(addObserverIfDesiredNodeAvailable, showUnlinkTimeout);
        return;
    }
    unlinkObserver.observe(unlinkedRefsContainer, obConfig);
  }
  addObserverIfDesiredNodeAvailable();

  logseq.App.onRouteChanged(() => {
    setTimeout(() => {
      addObserverIfDesiredNodeAvailable();
    }, showUnlinkTimeout) // wait for page load, otherwise would observer the previous page
  });

  logseq.beforeunload(async () => {
    unlinkObserver.disconnect()
  })

}

const inlineSelector = '.inline, .is-paragraph, h1, h2, h3, h4, h5, h6'
function addButton(blockEl, pageNames, isPureText) {
  let linkButton = blockEl.querySelector('.link-button')
  if (linkButton) {
    return
  }
  const blockID = blockEl.getAttribute('blockid')
  linkButton = doc.createElement("button");
  linkButton.setAttribute("class", "link-button");
  linkButton.innerHTML = "link";
  linkButton.addEventListener("click", async (e) => {
    const block = await logseq.Editor.getBlock(blockID)
    const content = block.content
    const reStr = '(' + pageNames.join('|') + ')'
    const re = new RegExp(reStr, "ig");

    /*
       page = cu
      'cu #focus #f/ocus #cu cus focus [[cu]] [[focus]]'
      '[[cu]] #focus #f/ocus #cu [[cu]]s fo[[cu]]s [[cu]] [[focus]]'
    */
    const newContent = content.replace(re, (match, _, i) => {
      while(i>=0) {
          if(/\s/.test(content[i])) {
              break
          } else if (content[i] == '[' || content[i] == '#') {
              return match
          }
          i -= 1;
      }

      return `[[${match}]]`
  })
    console.log("unlinked content: ", content, pageNames)
    console.log("linked content: ", newContent)

    await logseq.Editor.updateBlock(blockID, newContent)

    if(!isPureText) { // sometimes header and paragraph would cause block render error
      await logseq.Editor.editBlock(blockID)
      logseq.Editor.exitEditingMode()
    }

    let highlights = blockEl.querySelectorAll(`.${highlightClass}`)
    for (let i=0; i < highlights.length; i++) {
      // highlights[i].style.display = 'none'
      highlights[i].remove()
    }
    linkButton.style.display = 'none'
  })

  blockEl.querySelector(inlineSelector).appendChild(linkButton)
}

async function addHighlight(blockEl) {
  const inline = blockEl.querySelector(inlineSelector)
  if (!inline) {
    return
  }
  const pageNames = await getPageNames()

  const reStr = '(' + pageNames.join('|') + ')'
  const re = new RegExp(reStr, "ig");
  let child = inline.firstChild
  let processChild = []

  while (child) {
    if (child.nodeType == 3) {
      processChild.push(child)
    }

    child = child.nextSibling;
  }

  processChild.forEach(child => {
    const text = child.textContent
    if (re.test(text)) {
      const isPureText = inline.tagName == "SPAN"
      addButton(blockEl, pageNames, isPureText)
    }
    let domText = text.replace(re, `<span class="${highlightClass}">$1</span>`)
    let newDom = document.createElement("span");
    newDom.innerHTML = domText
    inline.replaceChild(newDom, child)
  })
}

logseq.ready(main).catch(console.error)
