import "@logseq/libs"

const doc = parent.document

async function getPageNames() {
  const page = await logseq.Editor.getCurrentPage()
  let pageNames = [page.name]
  if(page.properties) {
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
        console.log(blocks)
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
        //The node we need does not exist yet.
        //Wait 500ms and try again
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

function addButton(block) {
  let linkButton = block.querySelector('.link-button')
  if (linkButton) {
    return
  }
  const blockID = block.getAttribute('blockid')
  linkButton = doc.createElement("button");
  linkButton.setAttribute("class", "link-button");
  linkButton.innerHTML = "link";
  linkButton.addEventListener("click", (e) => {
    console.log("click ", blockID)
  })
  block.querySelector('.inline').appendChild(linkButton)
}

async function addHighlight(block) {
  const inline = block.querySelector('.inline')
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
      addButton(block)
    }
    let domText = text.replace(re, '<span class="link-highlight">$1</span>')
    let newDom = document.createElement("span");
    newDom.innerHTML = domText
    inline.replaceChild(newDom, child)
  })
}

logseq.ready(main).catch(console.error)
