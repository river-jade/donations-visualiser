var w = window,
    d = document,
    e = d.documentElement,
    g = d3.select("body").node(),
    navbar = d3.select(".navbar-default").node(),
    hoverInfo = d3.select(".hover-info"),
    filterPanel = d3.select('.filter-panel'),
    infoPanel = d3.select(".info-panel"),
    filterControl = d3.select('#filter-toggle'),
    infoControl = d3.select('#info-toggle'),
    $searchInput = $('#search');

var navbarHeight,
    width,
    height,
    bounds = {},
    containerDimensions = {},
    fireCoolingHandler = true;

var party_map = {},
    entity_map = {},
    years = [],
    receipt_types,
    clickedNode = null,
    oldYear = -1,
    data_loaded = false;

var narrowClient = $(window).width() < 800,
    extremelyNarrowClient = $(window).width() < 400,
    isMobile = false;
// Detect mobile - User Agent seems to be the best way to do this currently
if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;


// http://bootstraptour.com/api/
var tour = new Tour({
    backdrop: true,
    debug: true,
    delay: {
        show: 400,
        hide: 0
    },
    steps: [
        {
            title: "About this site",
            content: "This graph represents all of the donations to Australian " +
               "federal political parties in a given financial year.",
            element: "#vis .graph .container",
            placement: "left",
            backdrop: true,
        },
        {
            title: "About this site",
            content: "Square nodes represent political parties",
            element: "path.node.australian-labor-party.party",
            backdrop: true,
        },
        {
            title: "About this site",
            content: "Circular nodes represent donors",
            element: "path.node.westpac-banking-corporation.entity",
            backdrop: true,
        },
        {
            title: "Details view",
            content: "Clicking on a node gives details for that entity (eg party or " +
                "donor), including top donations, and donations over time.",
            element: "path.node.coalition.party",
            backdrop: true,
            placement: "left",
            onShow: function(tour) {
                d3Click("path.node.coalition.party");
                toggleInfoPanel(null, true);
            }
        },
        {
            title: "Details view",
            content: "Clicking the name in the details panel opens a Google search for that entity.",
            element: "#info-panel h3 a",
            backdrop: true,
            placement: "left",
        },
        {
            title: "Details view",
            content: "Hovering over the donor name shows them in the graph. Click on a name for more details.",
            element: "#info-table",
            backdrop: true,
            placement: "left",
        },
        {
            title: "Filter panel",
            content: "You can filter the results, and show different years, by opening the filter panel.",
            element: "#filter-toggle",
            backdrop: true,
            onShow: function(tour) {
                toggleFilterPanel(null, true);
            }
        },
    ],
    afterSetState: function (key, value) {
        logClick('tour.gettingStarted', key, value);
    }
});

var party_logos = [
  {
    name: "Coalition",
    id: 'coalition',
    image: "img/coalition.png"
  },
  {
    name: "Australian Labor Party",
    id: 'labor',
    image: "img/alp.svg"
  },
  {
    name: "Australian Greens",
    id: 'greens',
    image: "img/greens.svg"
  },
  {
    name: "Palmer United Party",
    id: 'pup',
    image: "img/pup.jpeg"
  }
];

setLayoutSizes();

// 1, 10k, 100k, 1M, 10M, 100M
var domain = [4, 5, 6, 7, 8].map(function(x) { return Math.pow(10, x); });
var range = ["#2fd696", "#25B880", "#21A271", "#209991", "#1B8079" ];
var nodeColors = d3.scale.threshold().domain(domain).range(range);
var dollarFormat = d3.format("$,.0f");

var svg = d3.select("div#vis").append("svg")
    .attr("class", "graph")
    .attr("width", width)
    .attr("height", height);

var zoom = d3.behavior.zoom()
    .scale(1)
    .scaleExtent([.1, 5])
    .on("zoom", zoomed);

var zoom_slider = d3.select("#zoom-controls").select("input")
    .datum({})
    .attr("value", zoom.scale())
    .attr("min", zoom.scaleExtent()[0])
    .attr("max", zoom.scaleExtent()[1])
    .attr("step", .1)
    .on("input", zoom_slided);

var value_slider = function() {
    var tick_format = function (d) {
        var prefix = d3.formatPrefix(d);
        return prefix.scale(d) + prefix.symbol;
    };
    var slider_axis = d3.svg.axis()
        .tickValues([1000,10000,100000,1000000, 1000000, 10000000])
        .tickFormat(tick_format).orient("bottom");

    return d3.slider().axis(slider_axis)
        .on("slide", updateLabels)
        .on("slideend", filterData);
// immediately invoked!
}();

// ============================================================
// Set image svg pattern defs from declared logos
// ============================================================

party_logos.forEach(function(item) {
  svg.append("filter")
       .attr('id', item.id)
       .attr('patternUnits', 'objectBoundingBox')
       .attr('x', '0%')
       .attr('y', '0%')
       .attr('width', '100%')
       .attr('height', '100%')
       .append("feImage")
       .attr("xlink:href", item.image);
});

// Compute mapping once
var name_to_logo = {};
party_logos.forEach(function(item) {
  name_to_logo[item.name] = item.id;
});


// ============================================================
// Handle Window Resize
// ============================================================

function setLayoutSizes() {
    // hackily set the navbar height to cater for the responsive layout
    navbarHeight = navbar.getBoundingClientRect().height;
    g.style.setProperty('padding', navbarHeight + 'px 0 0 0');

    width = w.innerWidth || e.clientWidth || g.clientWidth;
    height = (w.innerHeight || e.clientHeight || g.clientHeight) - navbarHeight;
}

function resizeWindow() {
    setLayoutSizes();

    svg.attr("width", width)
        .attr("height", height);

    fireCoolingHandler = true;

    force.size([width, height]);
    if (data_loaded) force.start();
}

function readjustCanvas() {
      // Need to readjust top navbar padding hack
      setLayoutSizes();
      resizeWindow();
}

d3.select(w).on("resize", resizeWindow);

// ============================================================
// Set up for a mobile or tablet
// ============================================================

// Will use pinch zoom - therefore no need to display zoom controls
if (isMobile) {
   d3.select("#zoom-controls").classed('hidden', true);
}


// ============================================================
// Handle offcanvas elements
// ============================================================

function toggleChevron(e) {
    $('#chevron').toggleClass('glyphicon-chevron-down glyphicon-chevron-up');
    readjustCanvas();
}

$('#dialog-buttons').on('hidden.bs.collapse', toggleChevron);
$('#dialog-buttons').on('shown.bs.collapse', toggleChevron);

$('#mobile-warning').on('closed.bs.alert', readjustCanvas);


var filterPanelOpen = false;

function toggleInfoPanel(event, state) {
    if (typeof state !== 'undefined') infoPanelOpen = state;
    else infoPanelOpen = !infoPanelOpen;
    infoPanel.classed('open', infoPanelOpen);

    // if on extremely narrow client, hide info button
    if (extremelyNarrowClient) {
      filterControl.classed('hidden', infoPanelOpen);
    }
    // if on narrow client, make sure info panel gets hidden
    if (narrowClient && infoPanelOpen) {
      filterPanel.classed('open', false);
      filterPanelOpen = false;
    }
}
$('#info-toggle').on('click', toggleInfoPanel);


var infoPanelOpen = false;

function toggleFilterPanel(event, state) {
    if (typeof state !== 'undefined') filterPanelOpen = state;
    else filterPanelOpen = !filterPanelOpen;
    filterPanel.classed('open', filterPanelOpen);

    // if on extremely narrow client, hide info button
    if (extremelyNarrowClient) {
      infoControl.classed('hidden', filterPanelOpen);
    }
    // if on narrow client, make sure info panel gets hidden
    if (narrowClient && filterPanelOpen) {
      infoPanel.classed('open', false);
      infoPanelOpen = false;
    }
}
$('#filter-toggle').on('click', toggleFilterPanel);

// ============================================================
// Event Listeners
// ============================================================

d3.select("#zoom-in").on("click", zoomIn);
d3.select("#zoom-out").on("click", zoomOut);
d3.select("#zoom-to-fit").on("click", zoomToFit);

d3.select("#party-select-all").on("click", function() { selectAll('#party_select'); });
d3.select("#party-select-clear").on("click", function() { clearSelection('#party_select'); });
d3.select("#receipt-type-select-all").on("click", function() { selectAll('#receipt_type_select'); });
d3.select("#receipt-type-select-clear").on("click", function() { clearSelection('#receipt_type_select'); });
d3.select("#clear-search").on("click", clearSearch);

var $gettingStarted = $('#getting-started-modal');
d3.select('.js-handleStartTour').on('click', function() {
    if (tour.ended) tour.restart();
});

// on 'escape' key press, close the info window, and zoomToFit
$("body").on("keydown", function (event) {
  var escKey = 27;
  if (event.which === escKey) {
    zoomToFit();
    toggleInfoPanel(null, false);
    toggleFilterPanel(null, false);
  }
});

// ============================================================
// Force Layout
// ============================================================

var force = d3.layout.force()
    .size([width, height])
    .charge(function(n) { return -4 * n.size; })
    .linkDistance(50)
    .theta(.5)
    .friction(0.7)
    .gravity(0.4)
    .on("tick", tick);


// ============================================================
// Init: load json, kick off the app
// ============================================================

var progress_counter = 0;

var data_request = d3.json("data/all_data.json")
    .on("progress", function() {
        progress_counter++;

        if (progress_counter == 3) {
            $("#loading-modal").modal({
                show: true,
                keyboard: false,
                backdrop: "static"
            });
        } else if (progress_counter > 3) {
            if (d3.event.loaded != d3.event.total) {

                var progress = d3.event.loaded * 100 / d3.event.total;
                d3.select("#loading-progress").style("width", progress + "%");
            }
        }
    })
    .on("load", function(data) {
        d3.select("#loading-progress").style("width", "100%");
        $("#loading-modal").modal('hide');
        processData(data);
        data_loaded = true;

        // zoom out a ways initially
        zoomTo(0.5).event(container);

        updateSlider();
    })
    .on("error", function() { console.log("error"); })
    .get();


// returns true if this is the first time the app has loaded
// (or cookies have been reset)
function firstLoad() {
    if (Cookies.get("loaded") === "true") {
        return false;
    } else {
        Cookies.set("loaded", "true", { expires: Infinity });
        return true;
    }
}

// called by tick() when the force has cooled down
function coolHandler() {
    if (fireCoolingHandler) {
        fireCoolingHandler = false;
        zoomToFit();

        window.setTimeout(function() {
            if (!isMobile) toggleFilterPanel(null, true);
            if (firstLoad()) {
                tour.init();
                tour.restart();
            }
        }, 300);
    }
}

//d3.json("data/all_data.json", processData);


// ============================================================
// Zoom handlers
// ============================================================

function zoomed() {
    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    updateSlider();
}

function zoom_slided(d) {
    zoomTo(d3.select(this).property("value")).event(svg);
}

function zoomIn() {
    var newScale = zoom.scale() * 1.4;
    logClick('zoom', 'zoom_in', newScale);
    zoomTo(newScale).event(svg.transition().duration(350));
    updateSlider();
}

function zoomOut() {
    var newScale = zoom.scale() * 0.71;
    logClick('zoom', 'zoom_out', newScale);
    zoomTo(newScale).event(svg.transition().duration(350));
    updateSlider();
}

function zoomTo(newScale) {
    var scale = zoom.scale();
    var extent = zoom.scaleExtent();
    if (extent[0] <= newScale && newScale <= extent[1]) {
        var t = zoom.translate();
        var c = [width / 2, height / 2];
        return zoom
            .scale(newScale)
            .translate([
                c[0] + (t[0] - c[0]) / scale * newScale,
                c[1] + (t[1] - c[1]) / scale * newScale
            ]);
    }
    return zoom;
}

function zoomToFit() {
    var xRatio = width / bounds.width;
    var yRatio = height / bounds.height;
    // zoom out a bit further than our greateset dimension requires
    var newScale = Math.min(xRatio, yRatio) * 0.95;

    const topLeft = [
        0 - bounds.left,
        0 - bounds.top,
    ];

    // the leading zero here is the viewPort origin
    const centreScaled = [
        (0 + width / 2) - ((bounds.left + bounds.width / 2) * newScale),
        (0 + height / 2) - ((bounds.top + bounds.height / 2) * newScale),
    ];

    zoom.scale(newScale)
        .translate(centreScaled)
        .event(container.transition().duration(350));

    updateSlider();
}

// prefer using id as a selector, as there are duplicate classnames
function zoomToNode(selector) {
    var node = d3.select(selector).node().__data__;
    var newScale = 0.8;

    const nodeCentred = [
        (0 + width / 2) - (node.x * newScale),
        (0 + height / 2) - (node.y * newScale),
    ];
    zoom.scale(newScale)
        .translate(nodeCentred)
        .event(container.transition().duration(350));

    updateSlider();
}

function updateSlider() {
    if (d3.event)
        zoom_slider.property("value", d3.event.scale);
}

function search() {
    var term = d3.select("#search").node().value;
    logClick('search', 'do_search', term);

    var searchRegEx = new RegExp(term.toLowerCase());

    if (!nodeElements) return;

    nodeElements.each(function(d) {
        var element, match;
        element = d3.select(this);
        match = d.name.toLowerCase().search(searchRegEx);

        if (term.length > 0 && match >= 0) {
            // TODO(river): remove hardcoded colour!
            element.style("fill", "#00FFFF")
                .style("stroke", "#000");
            //element.transition().style("fill", "#fff").transition().style("fill", "#ff18de");
            return d.searched = true;
        } else if (term.length > 0) {
            d.searched = false;
            return element.style("fill", "grey")
                .style("stroke", "#ddd");
        } else {
            d.searched = false;
            return element.style("fill", function(d, i) { return nodeColors(d.total); })
                .style("stroke", "#ddd");
        }
    });
}

function rowOver(row, i) {
    node = null;
    if (row.values.type == 'Party') {
        node = party_map[row.key];
    } else {
        node = entity_map[row.key];
    }

    if (node == null) return;

    node.searched = true;

    linkElements.style("stroke", function(l) {
        if (l.source === node || l.target === node) {
            return "#555";
        } else {
            return "#ddd";
        }
    }).style("stroke-opacity", function(l) {
        if (l.source === node || l.target === node) {
            return 1.0;
        } else {
            return 0.5;
        }
    });

    nodeElements
        .style("stroke", function(n) {
            if (n.searched || n.clicked) {
                return "#000";
            } else {
                return "#ddd";
            }
        })
        .style("stroke-width", 1.0);
}

function rowOut(row, i) {
    node = null;
    if (row.values.type == 'Party') {
        node = party_map[row.key];
    } else {
        node = entity_map[row.key];
    }

    if (node == null) return;

    node.searched = false;

    linkElements
        .style("stroke", "#ddd")
        .style("stroke-opacity", 0.5);

    nodeElements
        .style("stroke", function(n) {
            if (n.searched || n.clicked) {
                return "#000";
            } else {
                return "#ddd";
            }
        })
        .style("stroke-width", 1.0);
}

function updateInfoPanel() {
    var html,
        yearTotals = [];

    if (clickedNode == null) return;
    if (clickedNode.Type == "Party") {
        var top10 = clickedNode.entityTotals
            .sort(function(a, b) { return b.values.total - a.values.total; })
            .slice(0, 10);

        yearTotals = d3.nest()
            .key(function(d) { return d.Year; })
            .rollup(function(leaves) { return d3.sum(leaves, function(e) { return e.Amount; }); })
            .entries(clickedNode.receipts);

        html = [
            '<h3><a href="http://www.google.com/#q=' + clickedNode.name + '" title="Search Google for this Party" target="_blank">' + clickedNode.name + '</a></h3>\n',
            '<hr />\n',
            '<h4>Details</h4>\n',
            '<p>Type: Party</p>\n',
            '<p>Total Amount Received: ' + dollarFormat(clickedNode.total) + '</p>',
            '<p>Top ' + top10.length + ' Payers:</p>\n',
            '<table id="info-table" class="table table-striped table-condensed table-hover"><tbody>\n',
            '</tbody></table>\n',
            '<h4>Total Amounts Received</h4>\n',
            '<svg></svg>',
            '<button class="btn btn-default" onClick="zoomToNode(\'#node-' + clickedNode.id + '\')">Zoom to node</button>',
        ].join('');
        d3.select("#info-panel").html(html);

        d3.select("#info-table").select("tbody").selectAll("tr")
            .data(top10)
            .enter().append("tr")
            .on("mouseover", rowOver)
            .on("mouseout", rowOut)
            .on("click", function(row) {
                rowOut(row);
                nodeClick(entity_map[row.key]);
            })
            .html(function(d) {
                return "<td class=\"small\">" + entity_map[d.key].name + "</td><td class=\"pull-right small\">" + dollarFormat(d.values.total) + "</td>";
            });
    } else if (clickedNode.Type == "Entity") {
        var top10 = clickedNode.partyTotals
            .sort(function(a, b) { return b.values.total - a.values.total; })
            .slice(0, 10);

        yearTotals = d3.nest()
            .key(function(d) { return d.Year; })
            .rollup(function(leaves) { return d3.sum(leaves, function(e) { return e.Amount; }); })
            .entries(clickedNode.payments);

        html = [
            '<h3><a href="http://www.google.com/#q=' + clickedNode.name + '" title="Search Google for this Entity" target="_blank">' + clickedNode.name + '</a></h3>\n',
            '<hr />\n',
            '<h4>Details</h4>\n',
            '<p>Type: Payer</p>\n',
            '<p>Total Amount Paid: ' + dollarFormat(clickedNode.total) + '</p>',
            '<p>Top ' + top10.length + ' Receivers:</p>\n',
            '<table id="info-table" class="table table-striped table-condensed table-hover"><tbody>\n',
            '</tbody></table>\n',
            '<h4>Total Amounts Paid</h4>\n',
            '<svg></svg>',
            '<button class="btn btn-default" onClick="zoomToNode(\'#node-' + clickedNode.id + '\')">Zoom to node</button>',
        ].join('');
        d3.select("#info-panel").html(html);

        d3.select("#info-table").select("tbody").selectAll("tr")
            .data(top10)
            .enter().append("tr")
            .on("mouseover", rowOver)
            .on("mouseout", rowOut)
            .on("click", function(row) {
                rowOut(row);
                nodeClick(party_map[row.key]);
            })
            .html(function(d) {
                return "<td class=\"small\">" + party_map[d.key].name + "</td><td class=\"pull-right small\">" + dollarFormat(d.values.total) + "</td>";
            });
    }

    var margins = { top: 0, right: 5, bottom: 25, left: extremelyNarrowClient ? 40 : 50 },
        chartWidth = 270 - margins.left - margins.right,
        chartHeight = 120 - margins.top - margins.bottom,
        x = d3.scale.ordinal().domain(d3.range(years[0], years[1] +1, 1)).rangeRoundBands([0, chartWidth]),
        y = d3.scale.linear().domain([0, d3.max(yearTotals, function(d) { return d.values; })]).range([chartHeight, 0]),
        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickValues(x.domain().filter(function(d, i) { return i % 2 == 0; })),
        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(5, "$s"),
        chart = d3.select("#info-panel").select("svg")
            .attr("width", chartWidth + margins.left + margins.right)
            .attr("height", chartHeight + margins.top + margins.bottom)
            .append("g")
                .attr("transform", "translate(" + margins.left + "," + margins.top + ")");


    chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + chartHeight + ")")
        .call(xAxis);

    chart.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    chart.selectAll("rect.bar")
        .data(yearTotals)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("title", function(d) { return d.key + ": " + dollarFormat(d.values); })
        .attr("x", function(d) { return x(+d.key) + 2; })
        .attr("y", function(d) { return y(d.values); })
        .attr("height", function(d) { return chartHeight - y(d.values); })
        .attr("width", x.rangeBand() - 4);

    toggleInfoPanel(null, true);

    d3.select("#info-button").transition().ease("linear").style("right", "310px");
    d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-chevron-right\"></span>");
}

// ============================================================
// Node events
// ============================================================

function nodeClick(node, i) {
    logClick('node', 'click', node.name);

    if (clickedNode === node) {
        toggleInfoPanel(null);
        return;
    }
    if (clickedNode) {
        clickedNode.clicked = false;
    }
    clickedNode = node;
    clickedNode.clicked = true;
    nodeElements.style("stroke", function(n) {
        if (n === clickedNode) {
            return "#000";
        } else {
            return "#ddd";
        }
    });
    updateInfoPanel();
}

function nodeOver(node, i) {
    var hoverContent = [
        '<p class="text-center">' + node.name + '</p>',
        '<hr class="tooltip-hr">',
        '<p class="text-center">' + dollarFormat(node.total) + '</p>'
    ].join('');

    // ensure that hoverInfo is always shown towards the centre of the viewPort
    var size = hoverInfo.node().getBoundingClientRect();
    var hoverPosition = {}
    hoverPosition.top = (d3.event.clientY > height / 2)
        ? d3.event.clientY - navbarHeight - 15 - size.height + "px"
        : d3.event.clientY - navbarHeight + 15 + "px"
    hoverPosition.left = (d3.event.clientX > width / 2)
        ? d3.event.clientX - 15 - size.width + "px"
        : d3.event.clientX + 15 + "px"

    hoverInfo
        .html(hoverContent)
        .style(hoverPosition)
        .classed("visible", true);

    linkElements
        .style("stroke", function(l) {
            if (l.source === node || l.target === node) {
                return "#555";
            } else {
                return "#ddd";
            }
        })
        .style("stroke-opacity", function(l) {
            if (l.source === node || l.target === node) {
                return 1.0;
            } else {
                return 0.5;
            }
        });

    nodeElements
        .style("stroke", function(n) {
            if (n.searched || n.clicked) {
                return "#000";
            } else {
                return "#ddd";
            }
        })
        .style("stroke-width", 1.0);
}

function nodeOut(node, i) {
    hoverInfo.classed("visible", false);

    linkElements
        .style("stroke", "#ddd")
        .style("stroke-opacity", 0.5);

    nodeElements
        .style("stroke", function(n) {
            if (n.searched || n.clicked) {
                return "#000";
            } else {
                return "#ddd";
            }
        })
        .style("stroke-width", function(n) {
            return 1.0;
        });
}


// ============================================================
// User selections / filters
// ============================================================

function clearSelection(id) {
    d3.select(id).selectAll("input").property("checked", false);
    filterData();
}

function selectAll(id) {
    var type_select = d3.select(id).selectAll("input"),
    checked = type_select.filter(function(d) { return this.checked; }).size();

    if (type_select.size() != checked) {
        type_select.property("checked", true);
        filterData();
    }
}

function clearSearch(e) {
    d3.select("#search").property("value", "");
    d3.event.preventDefault();
    search();
}

function updateLabels() {
    if (d3.event.type == "drag") {
        var values = value_slider.value(),
        displayFormat = d3.format("$0,0f");

        d3.select("#value-filter-min").attr("value", displayFormat(values[0]));
        d3.select("#value-filter-max").attr("value", displayFormat(values[1]));
    }
}

function filterData() {
    var selectedYear = +d3.select("#year_select").selectAll("option").filter(function(d) { return this.selected; }).node().value,
        allParties = d3.select("#party_select").selectAll("input").map(function(d) { return +d.value; }),
        selectedParties = d3.select("#party_select").selectAll("input").filter(function(d) { return this.checked; })[0] .map(function(d) { return +d.value; }),
        selectedReceiptTypes = d3.select("#receipt_type_select").selectAll("input").filter(function(d) { return this.checked; })[0].map(function(d) { return +d.value; }),
        valueRange = value_slider.value();

    var resetControls = false,
        filteredNodes = [],
        allParties = [];

    d3.keys(party_map).forEach(function(k) {
        node = party_map[k];

        node.yearReceipts = node.receipts.filter(function(d) { return (+d.Year == +selectedYear); });
        node.filteredReceipts = node.yearReceipts.filter(function(d) {
            allParties.push(+k);
            return (selectedReceiptTypes.indexOf(d.Type) != -1);
        });

        if (node.filteredReceipts.length > 0) {
            node.total = d3.sum(node.filteredReceipts, function(d) { return d.Amount; });
            node.children = [];
            node.entityTotals = d3.nest()
                .key(function(d) { return d.Entity; })
                .rollup(function(leaves) { return { type: 'Entity', total: d3.sum(leaves, function(e) { return e.Amount; }) }; })
                .entries(node.filteredReceipts);

            filteredNodes.push(node);
        }
    });

    allParties = d3.set(allParties).values().map(function(d) { return +d; });

    if (oldYear == selectedYear) {
        filteredNodes = filteredNodes.filter(function(d) { return selectedParties.indexOf(d.party_id) != -1; });
    } else {
        oldYear = selectedYear;
        selectedParties = allParties;
        resetControls = true;
    }

    d3.keys(entity_map).forEach(function(k) {
        node = entity_map[k];
        node.filteredPayments = node.payments.filter(function(d) {
            return (
                +d.Year == +selectedYear
                && selectedReceiptTypes.indexOf(d.Type) != -1
                && selectedParties.indexOf(d.Party) != -1
            );
        });


        if (node.filteredPayments.length > 0) {
            node.total = d3.sum(node.filteredPayments, function(d) { return d.Amount; });
            node.partyTotals = d3.nest()
                .key(function(d) { return d.Party; })
                .rollup(function(leaves) { return { type: 'Party', total: d3.sum(leaves, function(e) { return e.Amount; }) }; })
                .entries(node.filteredPayments);

            node.partyTotals.forEach(function(p) {
                if (valueRange) {
                    if (node.total >= valueRange[0] && node.total <= valueRange[1]) {
                        party_map[p.key].children.push(node);
                    }
                } else {
                    party_map[p.key].children.push(node);
                }
            });
        } else {
            node.partyTotals = [];
            node.total = 0;
        }
    });

    update(filteredNodes, allParties, selectedParties, resetControls);
}


// ============================================================
// Update
// ============================================================

function update(partyNodes, parties, selectedParties, resetControls) {
    force.stop();

    function flattenNodes(roots) {
        var nodes = [], i = 0;
        var done = [];

        roots.forEach(function(d) {
            d.id = i++;
            nodes.push(d);
        });

        roots.forEach(function(d) {
            d.children.forEach(function(e) {
                if (done.indexOf(e.entity_id) == -1) {
                    e.id = i++;
                    nodes.push(e);
                    done.push(e.entity_id);
                }
            });
        });

        return nodes;
    }

    function powerOfTen(d) {
        return d / Math.pow(10, Math.ceil(Math.log(d) / Math.LN10 - 1e-12)) === 1;
    }

    var nodes = flattenNodes(partyNodes),
    links = d3.layout.tree().links(nodes);

    force.nodes(nodes).links(links);

    d3.select("#party_select").selectAll(".checkbox").remove();

    var major_party_names = ["Coalition", "Australian Labor Party", "Australian Greens", "Palmer United Party"];
    // party indexes
    var major_parties = [];
    var minor_parties = [];

    // split party indexes between major and minor
    parties.forEach(function(item){
      var index = major_party_names.indexOf(party_map[item].name);
      // if it's a major party
      if (index > -1) {
        // put in same index as names has, to preserve order
        major_parties[index] = item;
      } else {
        minor_parties.push(item);
      }
    });

    // collapse sparse array; d3 doesn't like them
    major_parties = major_parties.filter(function (x) { return x !== undefined && x != null; });

    // sort minor parties alphabetically
    minor_parties = minor_parties.sort(function(a, b) {
      return party_map[a].name < party_map[b].name ? -1 : 1;
    });

    var createCheckboxes = function(party_indexes) {
      d3.select("#party_select").selectAll(".checkbox")
        .data(
            // values
            party_indexes,
            // key
            function(d) { return d; }
        )
        .enter().append("div")
            .attr("class", "checkbox")
            .html(function(d) {
               return "<label><input type=\"checkbox\" value=\"" + d + "\"" +  (selectedParties.indexOf(d) != -1 ? " checked=\"checked\"" : "") + ">" + party_map[d].name + "</label>";
            });
    }

    createCheckboxes(major_parties);
    d3.select("#party_select").append("hr").attr("class", "parties_separator");
    createCheckboxes(minor_parties);

    messageG.selectAll("text").remove();

    if (force.nodes().length == 0) {
        messageG.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", height/2)
            .text("No Data Found!")
        linksG.selectAll("line.link").remove();
        nodesG.selectAll(".node").remove();

        return;
    }

    //var extents = d3.extent(entity_nodes, function(n) { return n.total; });
    var extents = d3.extent(nodes, function(n) { return n.total; });

    var start = extents[0],
        end = extents[1],
        mean = d3.mean(nodes, function(d) { return d.total; }),
        median = d3.median(nodes, function(d) { return d.total; });

    if (resetControls) {
        var displayFormat = d3.format("$0,0f");
        value_slider.scale(d3.scale.log().domain(extents));
        value_slider.min(extents[0]).max(extents[1]);
        value_slider.value([20000, extents[1]]);

        d3.select("#value-filter-min").attr("value", displayFormat(20000));
        d3.select("#value-filter-max").attr("value", displayFormat(extents[1]));
        d3.select("#value-filter").html("");
        d3.select("#value-filter").call(value_slider);
    }

    nodeElements = nodesG.selectAll(".node")
        .data(force.nodes(), function(d, i) {
            return d.name + "-" + i;
        });

    // enter
    nodeElements.enter()
        .append("path")
        .attr("id", function(d) { return "node-" + d.id; })
        .attr("class", function(d) {
            return [
                'node',
                toTrainCase(d.name),
                toTrainCase(d.Type)
            ].join(' ');
        })
        .attr("title", function(n) { return n.name; })
        .attr("d", d3.svg.symbol()
        .size(function(d) {
            return d.size = Math.sqrt(d.total);
        })
        .type(function(d) { return (d.Type == "Party" ? "square" : "circle"); }))
        .style("stroke", "#ddd")
        .style("stroke-width", 1.0)
        .style("fill", function(d, i) { return d.Type == "Party" ? "#337AB7" : nodeColors(d.total); })
        .attr('filter', function(d, i) { if (d.Type == "Party" && name_to_logo[d.name]) {
            return "url(#"+name_to_logo[d.name]+")";
          } else {
            return  "none";
          }
        })
        .on("mouseover", nodeOver)
        .on("click", nodeClick)
        .on("mouseout", nodeOut);

    // no update required

    // exit
    nodeElements.exit().remove();

    linkElements = linksG.selectAll("line.link")
        .data(force.links(), function(d) {
            return d.source.id + "-" + d.target.id;
        });

    linkElements.enter().append("line")
        .attr("class", "link")
        .style("stroke", "#888")
        .style("stroke-width", 1.0)
        .style("stroke-opacity", 0.5);
    linkElements.exit().remove();

    updateInfoPanel();
    force.start();
}

function measureBounds(node) {
    if (bounds.reset) {
        // prime a fresh set of dimensions using the first node
        bounds.reset = false;

        bounds.xMin = node.x;
        bounds.xMax = node.x;
        bounds.yMin = node.y;
        bounds.yMax = node.y;
    } else {
        bounds.yMin = Math.min(bounds.yMin, node.y);
        bounds.yMax = Math.max(bounds.yMax, node.y);
        bounds.xMin = Math.min(bounds.xMin, node.x);
        bounds.xMax = Math.max(bounds.xMax, node.x);
    }

    bounds.width = bounds.xMax - bounds.xMin;
    bounds.height = bounds.yMax - bounds.yMin;
    bounds.top = bounds.yMin;
    bounds.left = bounds.xMin;
}

function tick(event) {
    bounds.reset = true;

    linkElements.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    //nodeElements.attr("cx", function(d) { return d.x; })
    //            .attr("cy", function(d) { return d.y; });
    nodeElements
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .each(measureBounds);

    // alpha is the internal cooling value: when it reaches zero, the force layout has finished moving
    if (event.alpha < 0.05) {
        coolHandler();
    }
}

function processData(data) {
    receipt_types = d3.entries(data.receipt_types).sort(function(a, b) { return (a.value < b.value) ? -1 : 1; }).map(function(d) { return d.key; })

    data.parties.forEach(function(d, i) {
        var node = {};
        node.Type = "Party";
        node.name = d;
        node.receipts = [];
        node.party_id = i;
        node.payers = [];

        party_map[i] = node;
    });

    data.entities.forEach(function(d, i) {
        var node = {};
        node.Type = "Entity";
        node.name = d.Name;
        node.entity_id = i;
        node.payments = [];
        node.parties = [];

        entity_map[i] = node;
    });

    names = data.parties;
    names.concat(data.entities.map(function(d) { return d.Name; }));

    data.receipts.forEach(function(d, i) {
        d.party = party_map[d.Party];
        d.entity = entity_map[d.Entity];
        d.receipt_type = receipt_types[d.Type];

        party_map[d.Party].receipts.push(d);
        entity_map[d.Entity].payments.push(d);
    });

    var yearTotalsReceiptType = d3.nest()
        .key(function(d) { return d.Year; })
        .key(function(d) { return d.receipt_type; })
        .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.Amount; }); });

    d3.keys(party_map).forEach(function(k) {
        party_map[k].yearTotals = yearTotalsReceiptType.entries(party_map[k].receipts);
    });

    d3.keys(entity_map).forEach(function(k) {
        entity_map[k].yearTotals = yearTotalsReceiptType.entries(entity_map[k].payments);
    });

    years = d3.extent(data.receipts, function(d) { return +d.Year; });

    d3.select("#receipt_type_select").selectAll("option")
        .data(receipt_types)
        .enter().append("div")
        .attr("class", "checkbox")
        .html(function(d, i) {
            var checked;
            if (d === "Public Funding")
                checked="";
            else
                checked="checked=\"true\" ";

            return "<label><input type=\"checkbox\" value=\"" + i + "\" " + checked + ">" + d + "</label>";
        });

    d3.select("#year_select").selectAll("option")
        .data(d3.range(years[1], years[0]-1, -1))
        .enter().append("option")
        .attr("value", function(y) { return y; })
        .attr("selected", function(y) { return (y == years[1]) ? "selected" : null; })
        .text(function(y) { return y + " - " + (y+1); });

    svg.append("rect")
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);


    container = svg.append("g").attr("class", "container").attr("width", width).attr("height", height);
    linksG = container.append("g").attr("class", "edges").attr("width", width).attr("height", height);
    nodesG = container.append("g").attr("class", "nodes").attr("width", width).attr("height", height);
    messageG = container.append("g").attr("width", width).attr("height", height);

    d3.select("#party_select").on("change", filterData);
    d3.select("#year_select").on("change", filterData);
    d3.select("#receipt_type_select").on("change", filterData);
    d3.select("#view_select").on("change", filterData);
    d3.select("#search").on("keyup", search);

    filterData();
}


function toTrainCase(str) {
    if (!str || typeof str !== 'string') return str;
    return str.toLowerCase().replace(/ /g, '-');
}

function inputText(selector, text) {
    var $input;
    if (selector.jQuery) $input = selector;
    else $input = $(selector);
    // $input.value = text;

    $input.val(text);
    console.log('$input, text', $input, text);
    // why is the search not triggered?
    $input.trigger('change');
}

// programmatically trigger a click with the expected parameters in the correct context
// http://stackoverflow.com/a/24259102/2586761
function d3Click(selector) {
    d3.selectAll(selector).each(function(d, i) {
        var onClickFunc = d3.select(this).on("click");
        onClickFunc.apply(this, [d, i]);
    });
}

// ============================================================
// Analytics
// ============================================================

function logClick(category, action, label) {
    ga('send', {
        hitType: 'event',
        eventCategory: category,
        eventAction: action,
        eventLabel: label
    });
}
