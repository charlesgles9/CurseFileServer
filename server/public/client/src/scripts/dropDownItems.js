function createDropdown(id, anchor, menuItems) {
  // Create the button element
  anchor.on("click", function (event) {
    const dropdown = $(`#${id}_dropdown`);
    updateDropDownPosition(anchor, dropdown);
    // event.stopPropagation();
  });
  // Create the dropdown menu div
  var $dropdown = $("<div></div>", {
    id: `${id}_dropdown`,
    class:
      "z-40 absolute  hidden bg-white divide-y divide-gray-100 rounded-lg shadow dark:bg-gray-700",
  });

  $(document).on("click", function (event) {
    var target = $(event.target);
    // Check if the clicked element is not the dropdown or its children
    if (
      !target.is($dropdown) &&
      !target.closest($dropdown).length &&
      !target.is(anchor) &&
      !target.closest(anchor).length
    ) {
      // Click occurred outside the dropdown, so add the "hidden" class to hide it
      $dropdown.addClass("hidden");
    }
  });
  // Create the ul element within the dropdown
  var $ul = $("<ul></ul>", {
    class: "py-2 text-sm text-gray-700 dark:text-gray-200",
  });

  // Create list items and anchor elements within the ul
  menuItems.forEach(function (item) {
    var $li = $("<li></li>", { class: "container" });
    var $span = $("<span>", { class: "container flex w-100 items-center" });
    var $a = $("<a></a>", {
      id: item.id,
      class:
        "flex w-100 px-6 py-2  hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ",
    });
    $span.append(item.text);
    // if this item has children add an collapse indicator
    if (item.child) {
      var collapseIndicator = $("<img>")
        .addClass(" w-4 h-4 lg:w-4 lg:h-4 ")
        .attr("src", "icons/forward_light.png")
        .attr("alt", "collapse");
      $span.append(collapseIndicator);
    }
    //add all nested dropdown items
    let childObject = item.child;
    let parentId = item.id;
    let parent = $a;
    if (childObject) {
      while (childObject) {
        if (childObject) {
          const childItem = createDropdown(parentId, parent, childObject);
          parent.append(childItem);
          childItem.click(() => {
            updateDropDownPosition(parent, childItem);
          });
        }
        parentId = childObject.id;
        childObject = childObject.child;
      }
    } else {
      $li.click(() => {
        if (item.callback) {
          // send callback
          item.callback();
          //close the dropdown by invoking the click event
          $(document).click();
        }
      });
    }

    $a.append($span);
    $li.append($a);
    $ul.append($li);
  });

  // Append the ul to the dropdown
  $dropdown.append($ul);
  return $dropdown;
}

function updateDropDownPosition(anchor, element) {
  const dropdown = element;
  if (dropdown.hasClass("hidden")) {
    dropdown.removeClass("hidden");
    setDropDownMargin(anchor, dropdown);
  } else {
    dropdown.addClass("hidden");
    dropdown
      .css("margin-top", `0px`)
      .css("margin-bottom", `0px`)
      .css("margin-left", `0px`);
  }
  anchor.focus();
}

function setDropDownMargin(anchor, element) {
  const dropdown = element;
  const maxHeight = $(document).height();
  let topDiff = maxHeight - anchor.offset().top;
  let targetYoffset = -10;
  let xOffset = Math.abs(anchor.width() + 10);
  let yOffsetTop = topDiff > targetYoffset ? targetYoffset : 0;
  let yOffsetBottom = topDiff < targetYoffset ? targetYoffset : 0;
  dropdown
    .css("margin-top", `${yOffsetTop}px`)
    .css("margin-bottom", `${yOffsetBottom}px`)
    .css("margin-left", `${xOffset}px`);
}
