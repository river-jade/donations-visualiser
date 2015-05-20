var w = window,
    d = document,
    e = d.documentElement,
    g = d3.select("body").node(),
    width = g.clientWidth,
    height = w.innerHeight || e.clientHeight || g.clientHeight;

var party_map = {}, entity_map = {}, years = [], receipt_types, 
    clickedNode = null, filterShown = false, infoShown = false, oldYear = -1;

var coalition_positions = [];

d3.select("#hover-info").style("display", "none");

var zoom = d3.behavior.zoom()
               .scale(1)
               //.translate([width/2, height/2])
               .scaleExtent([.1, 5])
               .on("zoom", zoomed);

var zoom_slider = d3.select("#zoom-controls").select("input")
    .datum({})
    .attr("value", zoom.scale())
    .attr("min", zoom.scaleExtent()[0])
    .attr("max", zoom.scaleExtent()[1])
    .attr("step", .1)
    .on("input", zoom_slided);

var value_slider = d3.select("#value-filter").select("input")
    .datum({})
    .on("input", value_filter_slided);

var nodeColors = d3.scale.category20();

var sizeScale = d3.scale.linear().range([10, 60, 65, 250]);

var resizeWindow = function() {
                       width = g.clientWidth,
                       height = w.innerHeight || e.clientHeight || g.clientHeight,

                       svg.attr("width", width)
                           .attr("height", height);

                       force.size([width, height]);
                       force.start();
                    }
d3.select(w).on("resize", resizeWindow);
$('.navmenu-fixed-left').offcanvas({ autohide: false, toggle: false });
$('.navmenu-fixed-left').offcanvas('hide');
$('#filter-toggle').on('click', function(d) {
    $('.navmenu-fixed-left').offcanvas('toggle');
    if (filterShown) {
        d3.select("#filter-button").transition().ease("linear").style("left", "10px");
        d3.select("#zoom-controls").transition().ease("linear").style("left", "24px");
        d3.select("#filter-toggle").html("<span class=\"glyphicon glyphicon-filter\"></span>");
        filterShown = false;
    } else {
        d3.select("#filter-button").transition().ease("linear").style("left", "310px");
        d3.select("#filter-toggle").html("<span class=\"glyphicon glyphicon-chevron-left\"></span>");
        d3.select("#zoom-controls").transition().ease("linear").style("left", "324px");
        filterShown = true;
    }
});

$('.navmenu-fixed-right').offcanvas({autohide: false, toggle: false });
$('.navmenu-fixed-right').offcanvas('hide');
$('#info-toggle').on('click', function(d) {
    $('.navmenu-fixed-right').offcanvas('toggle');
    if (infoShown) {
        d3.select("#info-button").transition().ease("linear").style("right", "10px");
        d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-info-sign\"></span>");
        infoShown = false;
    } else {
        d3.select("#info-button").transition().ease("linear").style("right", "310px");
        d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-chevron-right\"></span>");
        infoShown = true;
    }
});

d3.select("#party-select-all").on("click", selectAllParties);
d3.select("#party-select-invert").on("click", invertPartiesSelection);
d3.select("#receipt-type-select-all").on("click", selectAllReceiptTypes);
d3.select("#receipt-type-select-invert").on("click", invertReceiptTypesSelection);
d3.select("#clear-search").on("click", clearSearch);

var dollarFormat = d3.format("$,.0f");

var force = d3.layout.force()
              .size([width, height])
              .charge(function(n) { return -4 * n.size; })
              .linkDistance(50)
              .theta(.5)
              .friction(0.7)
              .gravity(0.4)
              .on("tick", tick);


d3.json("data/all_data.json", processData);

function zoomed() {
    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    zoom_slider.property("value", d3.event.scale);
}

function zoom_slided(d) {
    zoom.scale(d3.select(this).property("value")).event(svg);
}

function value_filter_slided(d) {
}

function search() {
    var term = d3.select("#search").node().value;
    var searchRegEx = new RegExp(term.toLowerCase());

    if (!nodeElements) return;

    nodeElements.each(function(d) {
        var element, match;
        element = d3.select(this);
        match = d.name.toLowerCase().search(searchRegEx);

        if (term.length > 0 && match >= 0) {
            element.style("fill", "#ff1d8e")
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

function nodeClick(node, i) {
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

    nodeElements.style("stroke", function(n) {
        if (n.searched || n.clicked) {
            return "#000";
        } else {
            return "#ddd";
        }
    }).style("stroke-width", 1.0);
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

    nodeElements.style("stroke", function(n) {
        if (n.searched || n.clicked) {
            return "#000";
        } else {
            return "#ddd";
        }
    }).style("stroke-width", 1.0);
}

function updateInfoPanel() {
    if (clickedNode == null) return;
    var html, yearTotals = [];

    if (clickedNode.Type == "Party") {
        var top10 = clickedNode.entityTotals.sort(function(a, b) { return b.values.total - a.values.total; }).slice(0, 10);
        yearTotals = d3.nest().key(function(d) { return d.Year; }).rollup(function(leaves) { return d3.sum(leaves, function(e) { return e.Amount; }); }).entries(clickedNode.receipts);

        html = "<h3><a href=\"http://www.google.com/#q="+ clickedNode.name + "\" title=\"Search Google for this Party\" target=\"_blank\">" + clickedNode.name + "</a></h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Party</p>\n";
        html += "<p>Total Amount Received: " + dollarFormat(clickedNode.total) + "</p>";
        html += "<p>Top " + top10.length + " Payers:</p>\n";
        html += "<table id=\"info-table\" class=\"table table-striped table-condensed table-hover\"><tbody>\n";
        html += "</tbody></table>\n";
        html += "<h4>Total Amounts Received</h4>\n";
        html += "<svg></svg";
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
        var top10 = clickedNode.partyTotals.sort(function(a, b) { return b.values.total - a.values.total; }).slice(0, 10);
        yearTotals = d3.nest().key(function(d) { return d.Year; }).rollup(function(leaves) { return d3.sum(leaves, function(e) { return e.Amount; }); }).entries(clickedNode.payments);

        html = "<h3><a href=\"http://www.google.com/#q="+ clickedNode.name + "\" title=\"Search Google for this Entity\" target=\"_blank\">" + clickedNode.name + "</a></h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Payer</p>\n";
        html += "<p>Total Amount Paid: " + dollarFormat(clickedNode.total) + "</p>";
        html += "<p>Top " + top10.length + " Receivers:</p>\n";
        html += "<table id=\"info-table\" class=\"table table-striped table-condensed table-hover\"><tbody>\n";
        html += "</tbody></table>\n";
        html += "<h4>Total Amounts Paid</h4>\n";
        html += "<svg></svg";
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

    $('.navmenu-fixed-right').offcanvas('show');
    infoShown = true;
    d3.select("#info-button").transition().ease("linear").style("right", "310px");
    d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-chevron-right\"></span>");
}

function nodeOver(node, i) {
    var hoverInfo = '<p class="text-center">' + node.name + '</p>';
        hoverInfo += '<hr class="tooltip-hr">';
        hoverInfo += '<p class="text-center">' + dollarFormat(node.total) + '</p>';

    d3.select("#hover-info").html(hoverInfo);
    d3.select("#hover-info").style("top", d3.event.y + 15 + "px")
                         .style("left", d3.event.x + 15 + "px")
                         .style("display", null);

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

    nodeElements.style("stroke", function(n) {
        if (n.searched || n.clicked) {
            return "#000";
        } else {
            return "#ddd";
        }
    }).style("stroke-width", 1.0);
}

function nodeOut(node, i) {
    d3.select("#hover-info").style("display", "none");
    linkElements.style("stroke", "#ddd")
                .style("stroke-opacity", 0.5)
    nodeElements.style("stroke", function(n) {
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

function selectAllParties(e) {
    var party_select = d3.select("#party_select").selectAll("input"),
        checked = party_select.filter(function(d) { return this.checked; }).size();

    if (party_select.size() != checked) {
        party_select.property("checked", true);
        filterData();
    }
}

function invertPartiesSelection(e) {
    var party_select = d3.select("#party_select").selectAll("input");

    party_select.property("checked", function(d) {
        return !this.checked;
    });
    filterData();
}

function selectAllReceiptTypes(e) {
    var receipt_type_select = d3.select("#receipt_type_select").selectAll("input"),
        checked = receipt_type_select.filter(function(d) { return this.checked; }).size();

    if (receipt_type_select.size() != checked) {
        receipt_type_select.property("checked", true);
        filterData();
    }
}

function invertReceiptTypesSelection(e) {
    var receipt_type_select = d3.select("#receipt_type_select").selectAll("input");

    receipt_type_select.property("checked", function(d) {
        return !this.checked;
    });
    filterData();
}

function clearSearch(e) {
    d3.select("#search").property("value", "");
    d3.event.preventDefault();
    search();
}

function filterData() {
    var selectedYear = +d3.select("#year_select").selectAll("option").filter(function(d) { return this.selected; }).node().value,
        allParties = d3.select("#party_select").selectAll("input").map(function(d) { return +d.value; }),
        selectedParties = d3.select("#party_select").selectAll("input").filter(function(d) { return this.checked; })[0] .map(function(d) { return +d.value; }),
        selectedReceiptTypes = d3.select("#receipt_type_select").selectAll("input").filter(function(d) { return this.checked; })[0].map(function(d) { return +d.value; });

    var filteredNodes = [], allParties = [];

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
    }

    d3.keys(entity_map).forEach(function(k) {
        node = entity_map[k];
        node.filteredPayments = node.payments.filter(function(d) { 
            return (+d.Year == +selectedYear && 
                    selectedReceiptTypes.indexOf(d.Type) != -1 &&
                    selectedParties.indexOf(d.Party) != -1);
        });

        if (node.filteredPayments.length > 0) {
            node.total = d3.sum(node.filteredPayments, function(d) { return d.Amount; });
            node.partyTotals = d3.nest()
                .key(function(d) { return d.Party; })
                .rollup(function(leaves) { return { type: 'Party', total: d3.sum(leaves, function(e) { return e.Amount; }) }; })
                .entries(node.filteredPayments);
    
            node.partyTotals.forEach(function(p) {
                party_map[p.key].children.push(node);
            });
        }
    });

    update(filteredNodes, allParties, selectedParties);
}

function update(partyNodes, parties, selectedParties) {
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

    var nodes = flattenNodes(partyNodes),
        links = d3.layout.tree().links(nodes);

    force.nodes(nodes).links(links);

    d3.select("#party_select").selectAll(".checkbox").remove();

    party_checkboxes = d3.select("#party_select").selectAll(".checkbox")
        .data(parties.sort(function(a, b) { return (party_map[a].name < party_map[b].name ? -1 : 1); }), function(d) { return d; })
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

    var entity_nodes = nodes.filter(function(d) { return d.Type == "Entity"; });

    var extents = d3.extent(entity_nodes, function(n) { return n.total; });
    var start = extents[0],
        end = extents[1],
        mean = d3.mean(entity_nodes, function(d) { return d.total; }),
        median = d3.median(entity_nodes, function(d) { return d.total; });    

    sizeScale.domain([start, median, mean, end])

    nodeElements = nodesG.selectAll(".node")
                       .data(force.nodes(), function(d, i) { 
                           return d.name + "-" + i; 
                       });

    nodeElements.enter().append("path").attr("class", "node")
        .attr("d", d3.svg.symbol()
                     .size(function(d) { 
                         d.size = sizeScale(d.total); 
                         if (d.Type == 'Party') d.size *= 2.5;
                         return d.size; })
                     .type(function(d) { return (d.Type == "Party" ? "square" : "circle"); }))
    nodeElements.attr("id", function(d, i) { return "node-" + i; })
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

function processData(error, data) {
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
            return "<label><input type=\"checkbox\" value=\"" + i + "\" checked=\"true\">" + d + "</label>";
        });

    d3.select("#year_select").selectAll("option")
        .data(d3.range(years[1], years[0]-1, -1))
      .enter().append("option")
        .attr("value", function(y) { return y; })
        .attr("selected", function(y) { return (y == years[1]) ? "selected" : null; })
        .text(function(y) { return y + " - " + (y+1); });

    svg = d3.select("div#vis").append("svg").attr("width", width).attr("height", height);
    svg.append("rect")
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr("width", width)
        .attr("height", height)
        .call(zoom);

    container = svg.append("g").attr("width", width).attr("height", height);
    linksG = container.append("g").attr("width", width).attr("height", height);
    nodesG = container.append("g").attr("width", width).attr("height", height);
    messageG = container.append("g").attr("width", width).attr("height", height);

    d3.select("#party_select").on("change", filterData);
    d3.select("#year_select").on("change", filterData);
    d3.select("#receipt_type_select").on("change", filterData);
    d3.select("#view_select").on("change", filterData);
    d3.select("#search").on("keyup", search);

    filterData();
}


                         
