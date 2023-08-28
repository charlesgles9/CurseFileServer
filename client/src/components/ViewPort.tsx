

function isElementVisible(element:HTMLElement){

    var rectBounds=element.getBoundingClientRect()
    var vph=window.innerHeight+rectBounds.height
    return (rectBounds.y>=0 && rectBounds.y<=vph)
}

export default isElementVisible