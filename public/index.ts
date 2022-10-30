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

  logseq.Editor.registerSlashCommand("unlink", async (e) => {
    console.log("run unlinking")
    const nodes = doc.querySelectorAll(".references")
    const node = nodes[nodes.length- 1];
    const blocks = node.querySelectorAll('.block-content')
    for(let i = 0; i < blocks.length; i++) {
      const blockID = blocks[i].getAttribute('blockid')
      let linkButton = doc.createElement("button");
      linkButton.setAttribute("class", "link-button");
      linkButton.innerHTML = "link";
      linkButton.addEventListener("click", (e) => {
        console.log("click ", blockID)
      })

      blocks[i].querySelector('.inline').appendChild(linkButton)
      const inline = blocks[i].querySelector('.inline')
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
        let domText = text.replace(re, '<span class="link-highlight">$1</span>')
        let newDom = document.createElement("span");
        newDom.innerHTML = domText
        inline.replaceChild(newDom, child)
      })
    }
  });
}

logseq.ready(main).catch(console.error)
