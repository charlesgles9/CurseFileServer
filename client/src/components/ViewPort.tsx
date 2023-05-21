

function isElementVisible(element:HTMLElement){

    var rectBounds=element.getBoundingClientRect()
    var vph=window.innerHeight
    return (rectBounds.top>=0 && rectBounds.bottom<=vph)
}

export default isElementVisible