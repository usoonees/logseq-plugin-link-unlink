import "@logseq/libs"

const doc = parent.document

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
    }

    span.link-highlight {
      backgroun-color: red;
      background-color: yellow;
    }

  `)

  let unlinkObserver, appContainer;

  const unlinkCallback = function (mutationsList, observer) {
    for (let i = 0; i < mutationsList.length; i++) {
      const addedNode = mutationsList[i].addedNodes[0];
      if (addedNode && addedNode.childNodes.length) {
        const nodes = doc.querySelectorAll(".references")
        const node = nodes[nodes.length- 1];
        const blocks = node.querySelectorAll('.block-content')
        if (blocks.length) {
          unlinkObserver.disconnect()
          for (let i=0; i < blocks.length; i++) {
            addHighlight(blocks[i])
          }
          unlinkObserver.observe(appContainer, obConfig);
        }
      }
    }
  };

  const obConfig = {
    childList: true,
    subtree: true,
  };
  unlinkObserver = new MutationObserver(unlinkCallback);

  function addObserverIfDesiredNodeAvailable() {
    appContainer = doc.getElementById("app-container");
    if(!appContainer) {
        setTimeout(addObserverIfDesiredNodeAvailable, 2000);
        return;
    }
    unlinkObserver.observe(appContainer, obConfig);
  }
  addObserverIfDesiredNodeAvailable();

  logseq.beforeunload(async () => {
    unlinkObserver.disconnect()
  })

}

function addButton(blockEl, pageNames) {
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
    const reStr = '[^[/]?' + '(' + pageNames.join('|') + ')'
    const re = new RegExp(reStr, "ig");
    const newContent = content.replace(re, ' [[$1]]').trim()
    console.log("oldContent", content, pageNames)
    console.log("newContent", newContent)
    logseq.Editor.updateBlock(blockID, newContent)
    let highlights = blockEl.querySelectorAll('.link-highlight')
    for (let i=0; i < highlights.length; i++) {
      highlights[i].remove()
    }
    linkButton.style.display = 'none'
    // blockEl.style.display = 'none';
  })

  blockEl.querySelector('.inline').appendChild(linkButton)
}

async function addHighlight(blockEl) {
  const inline = blockEl.querySelector('.inline')
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
      addButton(blockEl, pageNames)
    }
    let domText = text.replace(re, '<span class="link-highlight">$1</span>')
    let newDom = document.createElement("span");
    newDom.innerHTML = domText
    inline.replaceChild(newDom, child)
  })
}

logseq.ready(main).catch(console.error)
