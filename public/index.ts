import "@logseq/libs"

const doc = parent.document
async function main() {
  logseq.provideStyle(`
    button.link-button {
      float: right;
      padding-left: 5px;
      padding-right: 5px;
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
    }
  });
}

logseq.ready(main).catch(console.error)
