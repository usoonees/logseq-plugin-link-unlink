const selectRef = (name) => `.page-linked .page-ref[data-ref^="${name}"]`
const selectDarkRef = (name) =>
  `.dark .page-linked .page-ref[data-ref^="${name}"]`

function unHighlightRef(preNames) {
  const unsetSelector = preNames.map(selectRef).join(",")
  const unsetDarkSelector = preNames.map(selectDarkRef).join(",")
  logseq.provideStyle(`
	  ${unsetSelector} {
		background-color: unset;
	  }
  
	  ${unsetDarkSelector} {
		background-color: unset;
	  }
	`)
}

function highlightLinkRef(preNames, curNames) {
  unHighlightRef(preNames)
  const setSelector = curNames.map(selectRef).join(",")
  const setDarkSelector = curNames.map(selectDarkRef).join(",")
  logseq.provideStyle(`
	  ${setSelector} {
		background-color: yellow;
	  }
  
	  ${setDarkSelector} {
		background-color:  #ffff0030;
	  }
	`)
}

const selectTag = (name) => `.page-linked a.tag[data-ref^="${name}"]`
const selectDarkTag = (name) => `.dark .page-linked a.tag[data-ref^="${name}"]`

function unHighlightTag(preNames) {
  const unsetTagSelector = preNames.map(selectTag).join(",")
  const unsetTagDarkSelector = preNames.map(selectDarkTag).join(",")
  logseq.provideStyle(`
	${unsetTagSelector} {
	  background-color: unset;
	  color: unset;
	}
  
	${unsetTagDarkSelector} {
	  background-color: unset;
	  color: unset;
	}`)
}

function highlighTagRef(preNames, curNames) {
  unHighlightTag(preNames)
  const setTagSelector = curNames.map(selectTag).join(",")
  const setTagDarkSelector = curNames.map(selectDarkTag).join(",")
  logseq.provideStyle(`
	${setTagSelector} {
	  background-color: yellow;
	  color: #484576;
	}
  
	${setTagDarkSelector} {
	  background-color:  #ffff0030;
	  color: #ebdddd;
	}
  `)
}

export {highlighTagRef, unHighlightTag, highlightLinkRef, unHighlightRef}