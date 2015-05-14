var w = window,
    d = document,
    e = d.documentElement,
    g = d3.select("body").node(),
    width = g.clientWidth,
    height = w.innerHeight || e.clientHeight || g.clientHeight,
    parties, entites, receipts, receiptTypes, clickedNode, infoShown = false, filterShown = false,
    svg, selectedParties, selectedReceiptTypes, madeLinks, container, nodeElements, linkElements, messageElements,
    messageG, linksG, nodesG, drawLinks = [], drawNodes = [], nodes = [], selectedYears, nodeIds = {};

d3.select("#hover-info").style("display", "none");

var zoom = d3.behavior.zoom()
               .scale(1)
               .scaleExtent([.2, 1.8])
               .on("zoom", zoomed);

var slider = d3.select("#zoom-controls").select("input")
    .datum({})
    .attr("value", zoom.scale())
    .attr("min", zoom.scaleExtent()[0])
    .attr("max", zoom.scaleExtent()[1])
    .attr("step", .1)
    .on("input", slided);

var nodeColors = d3.scale.category20();

var radiusScale = d3.scale.sqrt().range([5, 30]);

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

d3.select("#year-select-all").on("click", selectAllYears);
d3.select("#party-select-all").on("click", selectAllParties);
d3.select("#receipt-type-select-all").on("click", selectAllReceiptTypes);
d3.select("#clear-search").on("click", clearSearch);



var dollarFormat = d3.format("$,.0f");

var force = d3.layout.force()
              .size([width, height])
              .charge(function(n) {
                  return -8 * Math.pow(radiusScale(n.TotalAmount), 2);
              })
              .linkDistance(55)
              .theta(0.5)
              .friction(0.75)
              .gravity(0.3)
              .on("tick", tick);


d3.json("data/all_data.json", processData);

function zoomed() {
    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    slider.property("value", d3.event.scale);
}

function slided(d) {
    zoom.scale(d3.select(this).property("value")).event(svg);
}

function radius(node) {
    if (node.Type === 'Party') {
        return 10;
    } else {
        return 5;
    }
}


function getYears() {
    var minYear = Infinity, maxYear = -Infinity;
    receipts.forEach(function(r) {
        if (+r.Year < minYear) {
            minYear = +r.Year;
        } else if (+r.Year > maxYear) {
            maxYear = +r.Year;
        }
    });

    return [minYear, maxYear];
}

function search() {
    var term = d3.select("#search").node().value;
    var searchRegEx = new RegExp(term.toLowerCase());

    nodeElements.each(function(d) {
        var element, match;
        element = d3.select(this);
        match = d.Name.toLowerCase().search(searchRegEx);

        if (term.length > 0 && match >= 0) {
            element.style("fill", "#ff1d8e")
                   .style("stroke", "#000");
            element.transition().attr("r", radiusScale(d.TotalAmount)*2).transition().attr("r", radiusScale(d.TotalAmount));
            return d.searched = true;
        } else {
            d.searched = false;
            return element.style("fill", function(d, i) { return nodeColors(d.Name); })
                          .style("stroke", "#ddd");
        }
    });
}

function nodeClick(node, i) {
    clickedNode = node;
    updateInfoPanel();
}

function updateInfoPanel() {
    if (clickedNode == null) return;
    var html;

    if (clickedNode.Type == "Party") {
        var party = parties.indexOf(clickedNode.Name),
            party_receipts = receipts.filter(function(r) { return selectedReceiptTypes.indexOf(+r.Type) != -1 && r.Party == party; }),
            year_party_receipts = party_receipts.filter(function(r) { return selectedYears.indexOf(+r.Year) != -1; }),
            totalAmount = d3.sum(year_party_receipts, function(d) { return d.Amount; }),
            yearTotals = d3.nest().key(function(d) { return d.Year; })
                                  .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.Amount; }); })
                                  .entries(party_receipts);
            top10 = d3.nest()
                        .key(function(d) { return d.Entity; })
                        .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.Amount; }); })
                        .entries(year_party_receipts)
                        .sort(function(a, b) { return b.values - a.values; });
        if (top10.length > 10) {
            top10 = top10.slice(0,10);
        }

        html = "<h3><a href=\"http://www.google.com/#q="+ clickedNode.Name + "\" title=\"Search Google for this Party\" target=\"_blank\">" + clickedNode.Name + "</a></h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Party</p>\n";
        html += "<p>Total Amount Received: " + dollarFormat(totalAmount) + "</p>";
        html += "<p>Top 10 Payers:</p>\n";
        html += "<table class=\"table table-striped table-condensed table-hover\"><tbody>\n";
        top10.forEach(function(d) {
            html += "<tr><td class=\"small\">" + entities[d.key].Name + "</td><td class=\"pull-right small\"> " + dollarFormat(d.values) + "</td></tr>\n";
        });
        html += "</tbody></table>\n";
        html += "<h4>Total Amounts Received</h4>\n";
    } else {
        var entity = -1;

        entities.forEach(function(d, i) { if (d.Name == clickedNode.Name) entity = i; });

        var entity_receipts = receipts.filter(function(r) { return selectedReceiptTypes.indexOf(+r.Type) != -1 && r.Entity == entity; }),
            year_entity_receipts = entity_receipts.filter(function(r) { return selectedYears.indexOf(+r.Year) != -1; }),
            totalAmount = d3.sum(year_entity_receipts, function(d) { return d.Amount; }),
            yearTotals = d3.nest().key(function(d) { return d.Year; })
                                  .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.Amount; }); })
                                  .entries(entity_receipts);
            top10 = d3.nest()
                        .key(function(d) { return d.Party; })
                        .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.Amount; }); })
                        .entries(year_entity_receipts)
                        .sort(function(a, b) { return b.values - a.values; });

        if (top10.length > 10) {
            top10 = top10.slice(0, 10);
        }
        html = "<h3><a href=\"http://www.google.com/#q="+ clickedNode.Name + "\" title=\"Search Google for this Entity\" target=\"_blank\">" + clickedNode.Name + "</a></h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Payer</p>\n";
        html += "<p>Total Amount Paid: " + dollarFormat(totalAmount) + "</p>";
        html += "<p>Top 10 Receivers:</p>\n";
        html += "<table class=\"table table-striped table-condensed table-hover\"><tbody>\n";
        top10.forEach(function(d) {
            html += "<tr><td class=\"small\">" + parties[d.key] + "</td><td class=\"pull-right small\"> " + dollarFormat(d.values) + "</td></tr>\n";
        });
        html += "</tbody></table>\n";
        html += "<h4>Total Amounts Paid</h4>\n";
    }


    d3.select("#info-panel").html(html);

    var margins = { top: 0, right: 0, bottom: 25, left: 30 },
        chartWidth = 270 - margins.left - margins.right,
        chartHeight = 120 - margins.top - margins.bottom,
        years = getYears(),
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
        chart = d3.select("#info-panel").append("svg")
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
            .attr("x", function(d) { return x(+d.key) + 1; })
            .attr("y", function(d) { return y(d.values); })
            .attr("height", function(d) { return chartHeight - y(d.values); })
            .attr("width", x.rangeBand() - 4);


    $('.navmenu-fixed-right').offcanvas('show');
    infoShown = true;
    d3.select("#info-button").transition().ease("linear").style("right", "310px");
    d3.select("#info-toggle").html("<span class=\"glyphicon glyphicon-chevron-right\"></span>");
}

function nodeOver(node, i) {
    var hoverInfo = '<p class="text-center">' + node.Name + '</p>';
        hoverInfo += '<hr class="tooltip-hr">';
        hoverInfo += '<p class="text-center">' + dollarFormat(node.TotalAmount) + '</p>';

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
        if (n.searched) {
            return "#000";
        } else if (neighbours(node, n)) {
            return "#555";
        } else {
            return "#ddd";
        }
    }).style("stroke-width", function(n) {
        if (neighbours(node, n)) {
            return 2.0;
        } else {
            return 1.0;
        }
    });
}

function nodeOut(node, i) {
    d3.select("#hover-info").style("display", "none");
    linkElements.style("stroke", "#ddd")
                .style("stroke-opacity", 0.5)
    nodeElements.style("stroke", function(n) {
                    if (n.searched) {
                        return "#000";
                    } else {
                        return "#ddd";
                    }
                })
                .style("stroke-width", function(n) {
                    return 1.0;
                });
}

function neighbours(a, b) {
    if (a in madeLinks) {
        return (b in madeLinks[a]);
    }

    return false;
}

function selectAllParties(e) {
    var party_select = d3.select("#party_select").selectAll("option"),
        selected_parties = d3.select("#party_select").selectAll("option").filter(function(d) { return this.selected; });

    d3.event.preventDefault();
    if (party_select.size() != selected_parties.size()) {
        party_select.attr("selected", "selected");
        filterAndUpdateData();
    }
}

function selectAllYears(e) {
    var year_select = d3.select("#year_select").selectAll("option"),
        selected_years = d3.select("#year_select").selectAll("option").filter(function(d) { return this.selected; });

    d3.event.preventDefault();
    if (year_select.size() != selected_years.size()) {
        year_select.attr("selected", "selected");
        filterAndUpdateData();
    }
}

function selectAllReceiptTypes(e) {
    var receipt_type_select = d3.select("#receipt_type_select").selectAll("option"),
        selected_receipt_types = d3.select("#receipt_type_select").selectAll("option").filter(function(d) { return this.selected; });
    d3.event.preventDefault();
    if (receipt_type_select.size() != selected_receipt_types.size()) {
        receipt_type_select.attr("selected", "selected");
        filterAndUpdateData();
    }
}

function clearSearch(e) {
    d3.select("#search").property("value", "");
    d3.event.preventDefault();
    search();
}

function filterAndUpdateData() {
    var totals = {};

    drawLinks = [];
    drawNodes = [];

    madeLinks = {};

    selectedParties = [];
    selectedYears = [];
    selectedReceiptTypes = [];

    d3.select("#year_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedYears.push(+this.value); });
    d3.select("#party_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedParties.push(+this.value); });
    d3.select("#receipt_type_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedReceiptTypes.push(+this.value); });

    var yearReceipts = receipts.filter(function(r) { return selectedYears.indexOf(+r.Year) != -1; }),
        allYearParties = d3.set(yearReceipts.map(function(r) { return +r.Party; })).values();

    var ids = {};
    allYearParties.forEach(function(d) { return ids[parties[d]] = d; });
    allYearParties = allYearParties.map(function(d) { return parties[d]; }).sort().map(function(d) { return +ids[d]; });

    if (selectedParties.length == 0) {
        selectedParties = allYearParties;
    }

    yearReceipts = yearReceipts.filter(function(r) { return (selectedReceiptTypes.indexOf(+r.Type) != -1) && (selectedParties.indexOf(+r.Party) != -1); });

    var yearParties = d3.set(yearReceipts.map(function(r) { return r.Party; })).values(),
        yearEntities = d3.set(yearReceipts.map(function(r) { return r.Entity; })).values(),
        i = 0;
    nodeIds = { entities: {}, parties: {} };

    var party_select = d3.select("#party_select").selectAll("option")
                             .data(allYearParties, function(d) { return parties[d]; });

    party_select.enter().append("option");
    party_select.attr("value", function(d) { return d; })
                .attr("selected", function(d) { return selectedParties.indexOf(+d) != -1 ? "selected" : null; })
                .text(function(d) { 
                    if (d == -1) {
                        return 'All Parties';
                    } else {
                        return parties[d]; 
                    }
                });
    party_select.exit().remove();

    yearParties.forEach(function(p) {
        var node = {
            Type: 'Party',
            Name: parties[p],
            TotalAmount: 0,
            links: [],
        };

        drawNodes.push(node);
        nodeIds.parties[p] = i;
        i++;
    });

    yearEntities.forEach(function(e) {
        var node = {
            Type: 'Entity',
            Name: entities[e].Name,
            TotalAmount: 0,
            links: [],
        };

        drawNodes.push(node);
        nodeIds.entities[e] = i;
        i++;
    });

    yearReceipts.forEach(function(r) {
        drawNodes[nodeIds['parties'][r.Party]].TotalAmount += +r.Amount;
        drawNodes[nodeIds['entities'][r.Entity]].TotalAmount += +r.Amount;

        var link = {
            source: nodeIds['entities'][r.Entity],
            target: nodeIds['parties'][r.Party]
        };

        var add = false;

        if (r.Entity in madeLinks) {
            if (madeLinks[r.Entity].indexOf(r.Party) == -1) {
                madeLinks[r.Entity].push(r.Party);
                add = true;
            }
        } else {
            madeLinks[r.Entity] = [r.Party, ];
            add = true;
        }


        if (add) {
            drawNodes[nodeIds['parties'][r.Party]].links.push(link);
            drawNodes[nodeIds['entities'][r.Entity]].links.push(link);

            drawLinks.push(link);
        }
    });

    draw();
    search();
    updateInfoPanel();
}

function draw() {
    force.stop();
    force.nodes(drawNodes)
         .links(drawLinks);

    messageG.selectAll("text").remove();

    if (force.nodes().length == 0) {
        messageG.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width/2)
                .attr("y", height/2)
                .text("No Data Found!")
        linksG.selectAll("line.link").remove();
        nodesG.selectAll("circle.node").remove();
        return;
    }

    radiusScale.domain(d3.extent(force.nodes(), function(n) { return n.TotalAmount; }));
    nodeColors.domain(force.nodes().map(function(n) { return n.Name; }));

    nodeElements = nodesG.selectAll("circle.node")
                       .data(force.nodes(), function(d, i) { 
                           return d.Name + "-" + i; 
                       });

    nodeElements.enter().append("circle").attr("class", "node");
    nodeElements.attr("r", function(n) { return radiusScale(n.TotalAmount); }).attr("id", function(d, i) { return i; })
                .style("stroke", "#ddd")
                .style("stroke-width", 1.0)
                .style("fill", function(d, i) { return nodeColors(d.Name); })
                .on("mouseover", nodeOver)
                .on("click", nodeClick)
                .on("mouseout", nodeOut);
    nodeElements.exit().remove();
    nodeElements.attr("title", function(n) { 
        return n.Name; 
    });


    linkElements = linksG.selectAll("line.link")
                       .data(force.links(), function(d) { return d.source + "-" + d.target; })

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

    nodeElements.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
}

function processData(error, data) {
    parties = data.parties;
    entities = data.entities;
    receipts = data.receipts;
    receipt_types = data.receipt_types;

    var years = getYears();

    selectedYears = [years[years.length-1], ];
    selectedReceiptTypes = d3.values(receipt_types);

    d3.select("#receipt_type_select").selectAll("option")
        .data(d3.keys(receipt_types))
      .enter().append("option")
        .attr("value", function(r) { return receipt_types[r]; })
        .attr("selected", "selected")
        .text(function(r) { return r; });


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

    filterAndUpdateData();

    d3.select("#party_select").on("change", filterAndUpdateData);
    d3.select("#year_select").on("change", filterAndUpdateData);
    d3.select("#receipt_type_select").on("change", filterAndUpdateData);
    d3.select("#search").on("keyup", search);
}


