var w = window,
    d = document,
    e = d.documentElement,
    g = d3.select("body").node(),
    navbar = d3.select(".navbar-default").node();

var navbarHeight,
    width,
    height;

var party_map = {},
    entity_map = {},
    years = [],
    receipt_types,
    clickedNode = null,
    oldYear = -1;

setLayoutSizes();

var nodeColors = d3.scale.category20();
var dollarFormat = d3.format("$,.0f");

var svg = d3.select("div#vis").append("svg")
    .attr("class", "graph")
    .attr("width", width)
    .attr("height", height);

d3.select("#hover-info").style("display", "none");

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

    force.size([width, height]);
    force.start();
}

d3.select(w).on("resize", resizeWindow);


// ============================================================
// Handle offcanvas elements
// ============================================================

var filterPanel = d3.select('.filter-panel');
var filterPanelOpen = false;

function toggleInfoPanel(event, state) {
    if (typeof state !== 'undefined') infoPanelOpen = state;
    else infoPanelOpen = !infoPanelOpen;
    infoPanel.classed('open', infoPanelOpen);
}
$('#info-toggle').on('click', toggleInfoPanel);


var infoPanel = d3.select(".info-panel");
var infoPanelOpen = false;

function toggleFilterPanel(event, state) {
    if (typeof state !== 'undefined') filterPanelOpen = state;
    else filterPanelOpen = !filterPanelOpen;
    filterPanel.classed('open', filterPanelOpen);
}
$('#filter-toggle').on('click', toggleFilterPanel);

// ============================================================
// Event Listeners
// ============================================================

d3.select("#zoom-in").on("click", zoomIn);
d3.select("#zoom-out").on("click", zoomOut);

d3.select("#party-select-all").on("click", function() { selectAll('#party_select'); });
d3.select("#party-select-clear").on("click", function() { clearSelection('#party_select'); });
d3.select("#receipt-type-select-all").on("click", function() { selectAll('#receipt_type_select'); });
d3.select("#receipt-type-select-clear").on("click", function() { clearSelection('#receipt_type_select'); });
d3.select("#clear-search").on("click", clearSearch);


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

        updateSlider();
    })
    .on("error", function() { console.log("error"); })
    .get();


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
            return element.style("fill", function(d, i) { return nodeColors(d.name); })
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

    var margins = { top: 0, right: 0, bottom: 25, left: 50 },
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
    var hoverInfo = '<p class="text-center">' + node.name + '</p>';
    hoverInfo += '<hr class="tooltip-hr">';
    hoverInfo += '<p class="text-center">' + dollarFormat(node.total) + '</p>';

    d3.select("#hover-info").html(hoverInfo);
    d3.select("#hover-info").style("top", d3.event.clientY + 15 + "px")
        .style("left", d3.event.clientX + 15 + "px")
        .style("display", null);

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
    d3.select("#hover-info").style("display", "none");

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

    party_checkboxes = d3.select("#party_select").selectAll(".checkbox")
        .data(
            // values
            parties.sort(function(a, b) {
                return party_map[a].name < party_map[b].name ? -1 : 1;
            }),
            // key
            function(d) { return d; }
        )
        .enter().append("div")
            .attr("class", "checkbox")
            .html(function(d) {
                return "<label><input type=\"checkbox\" value=\"" + d + "\"" +  (selectedParties.indexOf(d) != -1 ? " checked=\"checked\"" : "") + ">" + party_map[d].name + "</label>";
            });

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

//var entity_nodes = nodes.filter(function(d) { return d.Type == "Entity"; });

//var extents = d3.extent(entity_nodes, function(n) { return n.total; });
var extents = d3.extent(nodes, function(n) { return n.total; });


var start = extents[0],
end = extents[1],
//mean = d3.mean(entity_nodes, function(d) { return d.total; }),
//median = d3.median(entity_nodes, function(d) { return d.total; });
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

nodeElements.enter().append("path").attr("class", "node");
nodeElements
    .attr("d", d3.svg.symbol()
        .size(function(d) {
            return d.size = Math.sqrt(d.total);
        })
        .type(function(d) { return (d.Type == "Party" ? "square" : "circle"); })
    )
    .attr("id", function(d, i) { return "node-" + i; })
    .style("stroke", "#ddd")
    .style("stroke-width", 1.0)
    .style("fill", function(d, i) { return nodeColors(d.name); })
    .on("mouseover", nodeOver)
    .on("click", nodeClick)
    .on("mouseout", nodeOut);

nodeElements.exit().remove();
nodeElements.attr("title", function(n) {
    return n.name;
});


linkElements = linksG.selectAll("line.link")
    .data(force.links(), function(d) { return d.source.id + "-" + d.target.id; })

linkElements.enter().append("line").attr("class", "link")
    .style("stroke", "#ddd")
    .style("stroke-width", 1.0)
    .style("stroke-opacity", 0.5);
linkElements.exit().remove();

updateInfoPanel();

force.start();
}

function tick() {
    linkElements.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    //nodeElements.attr("cx", function(d) { return d.x; })
    //            .attr("cy", function(d) { return d.y; });
    nodeElements.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
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
    nodeColors.domain(names);

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
