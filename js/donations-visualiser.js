var w = window,
    d = document,
    e = d.documentElement,
    g = d3.select("body").node(),
    width = g.clientWidth,
    height = w.innerHeight || e.clientHeight || g.clientHeight,
    parties, entites, receipts, receiptTypes, yearReceiptsByParty, yearReceiptsByEntity, clickedNode, 
    infoShown = false, filterShown = false, svg, selectedParties, selectedReceiptTypes, container, 
    nodeElements, linkElements, messageG, linksG, nodesG, drawLinks = [], 
    drawNodes = [], selectedYear;

d3.select("#hover-info").style("display", "none");

var zoom = d3.behavior.zoom()
               .scale(1)
               //.translate([width/2, height/2])
               .scaleExtent([.1, 5])
               .on("zoom", zoomed);

var slider = d3.select("#zoom-controls").select("input")
    .datum({})
    .attr("value", zoom.scale())
    .attr("min", zoom.scaleExtent()[0])
    .attr("max", zoom.scaleExtent()[1])
    .attr("step", .1)
    .on("input", slided);

var nodeColors = d3.scale.category20();

var radiusScale = d3.scale.linear().range([10, 60, 65, 250]);

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
                  return -4 * n.radius;
              })
              .linkDistance(50)
              .theta(.5)
              .friction(0.7)
              .gravity(.4)
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
            //element.transition().style("fill", "#fff").transition().style("fill", "#ff18de");
            return d.searched = true;
        } else {
            d.searched = false;
            return element.style("fill", function(d, i) { return nodeColors(d.Name); })
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
    row.node.searched = true;
    linkElements.style("stroke", function(l) {
        if (l.source === row.node || l.target === row.node) {
            return "#555";
        } else {
            return "#ddd";
        }
    }).style("stroke-opacity", function(l) {
        if (l.source === row.node || l.target === row.node) {
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
    row.node.searched = false;
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
    var html;

    if (clickedNode.Type == "Party") {
        var top10 = clickedNode.receipts.sort(function(a, b) { return b.values - a.values; }).slice(0, 10);
        
        top10.forEach(function(d) {
            d.node = clickedNode.entity_nodes[d.key];
        });

        yearTotals = yearReceiptsByParty.filter(function(d) { return d.key == clickedNode.party_id; })[0].values;

        html = "<h3><a href=\"http://www.google.com/#q="+ clickedNode.Name + "\" title=\"Search Google for this Party\" target=\"_blank\">" + clickedNode.Name + "</a></h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Party</p>\n";
        html += "<p>Total Amount Received: " + dollarFormat(clickedNode.TotalAmount) + "</p>";
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
                nodeClick(row.node); 
            })
            .html(function(d) {
                return "<td class=\"small\">" + entities[d.key].Name + "</td><td class=\"pull-right small\">" + dollarFormat(d.values) + "</td>";
            });
    } else if (clickedNode.Type == "Entity") {
        var top10 = clickedNode.receipts.sort(function(a, b) { return b.amount - a.amount; }).slice(0, 10);
        
        top10.forEach(function(d) {
            d.node = clickedNode.party_nodes[d.party];
        });

        yearTotals = yearReceiptsByEntity.filter(function(d) { return d.key == clickedNode.entity_id; })[0].values;

        html = "<h3><a href=\"http://www.google.com/#q="+ clickedNode.Name + "\" title=\"Search Google for this Entity\" target=\"_blank\">" + clickedNode.Name + "</a></h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Payer</p>\n";
        html += "<p>Total Amount Paid: " + dollarFormat(clickedNode.TotalAmount) + "</p>";
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
            .on("click", function(row) { nodeClick(row.node); })
            .html(function(d) {
                return "<td class=\"small\">" + parties[d.party] + "</td><td class=\"pull-right small\">" + dollarFormat(d.amount) + "</td>";
            });
    } else {
        var top10 = clickedNode.Others.sort(function(a, b) { return b.values - a.values; }).slice(0, 10);
        html = "<h3>" + clickedNode.Name + "</h3>\n";
        html += "<hr />\n";
        html += "<h4>Details</h4>\n";
        html += "<p>Type: Payers</p>\n";
        html += "<p>Total Amount Paid: " + dollarFormat(clickedNode.TotalAmount) + "</p>";
        html += "<p>Top " + top10.length + " Payers:</p>\n";
        html += "<table id=\"info-table\" class=\"table table-striped table-condensed table-hover\"><tbody>\n";
        html += "</tbody></table>\n";
        d3.select("#info-panel").html(html);

        d3.select("#info-table").select("tbody").selectAll("tr")
            .data(top10)
          .enter().append("tr")
            .attr("class", "nohover")
            .html(function(d) {
                return "<td class=\"small\">" + entities[d.key].Name + "</td><td class=\"pull-right small\">" + dollarFormat(d.values) + "</td>";
            });
    }

    if (clickedNode.Type != "Others") {
        var margins = { top: 0, right: 0, bottom: 25, left: 50 },
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
    }

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

    selectedParties = [];
    selectedReceiptTypes = [];

    d3.select("#party_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedParties.push(+this.value); });
    d3.select("#receipt_type_select").selectAll("option").filter(function(d) { return this.selected; }).each(function(d) { selectedReceiptTypes.push(+this.value); });
    selectedYear = d3.select("#year_select").selectAll("option").filter(function(d) { return this.selected; }).node().value;
    var viewSelect = d3.select("#view_select").selectAll("option").filter(function(d) { return this.selected; }).node().value;

    var yearReceipts = receipts.filter(function(r) { return selectedYear == r.Year; });

    var allYearParties = d3.set(yearReceipts.map(function(r) { return +r.Party; })).values();

    var ids = {};
    allYearParties.forEach(function(d) { return ids[parties[d]] = d; });
    allYearParties = allYearParties.map(function(d) { return parties[d]; }).sort().map(function(d) { return +ids[d]; });

    if (selectedParties.length == 0) {
        selectedParties = allYearParties;
    }

    yearReceiptsByParty = d3.nest().key(function(d) { return +d.Party; })
        .key(function(d) { return +d.Year; })
        .rollup(function(leaves) { return d3.sum(leaves, function(d) { return +d.Amount; }); })
        .entries(receipts.filter(function(d) {
            return (selectedReceiptTypes.indexOf(+d.Type) != -1 &&
                    selectedParties.indexOf(+d.Party) != -1);
        }));

    yearReceiptsByEntity = d3.nest().key(function(d) { return +d.Entity; })
        .key(function(d) { return +d.Year; })
        .rollup(function(leaves) { return d3.sum(leaves, function(d) { return +d.Amount; }); })
        .entries(receipts.filter(function(d) {
            return (selectedReceiptTypes.indexOf(+d.Type) != -1 &&
                    selectedParties.indexOf(+d.Party) != -1);
        }));

    yearReceipts = yearReceipts.filter(function(r) { return (selectedReceiptTypes.indexOf(+r.Type) != -1) && (selectedParties.indexOf(+r.Party) != -1); });

    var dataEntries = d3.nest().key(function(d) { return d.Party; })
        .key(function(d) { return d.Entity; })
        .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.Amount; }); })
        .entries(yearReceipts)

    switch(viewSelect) {
        case "top20": console.log("top20 selected");
                      dataEntries.forEach(function(d) {
                          d.values = d.values.sort(function(a, b) { return a.values - b.values; });
                          if (d.values.length > 20) {
                              d.others = d3.sum(d.values.slice(0, -20), function(e) { return e.values; });
                              d.other_values = d.values.slice(0, -20);
                              d.values = d.values.slice(-20);
                          }
                      });
                      break;
        case "top-bottom": console.log("top-bottom selected");
                      dataEntries.forEach(function(d) {
                          d.values = d.values.sort(function(a, b) { return a.values - b.values; });
                          if (d.values.length > 20) {
                              d.others = d3.sum(d.values.slice(20, -20), function(e) { return e.values; });
                              d.other_values = d.values.slice(0, -20);
                              d.values = d.values.slice(-20).concat(d.values.slice(0, 20));
                          }
                      });
                      break;
        default: break;
    }

    var i = 0, doneEntities = [];

    var party_select = d3.select("#party_select").selectAll("option")
                             .data(dataEntries.map(function(d) { return d.key; }), function(d) { return parties[d]; });

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

    dataEntries.forEach(function(d) {
        var party_node = {
            Type: 'Party',
            Name: parties[d.key],
            party_id: d.key,
            links: [],
            entity_nodes: {},
            TotalAmount: 0,
            receipts: d.values,
            id: i++,
        };

        drawNodes.push(party_node);

        d.values.forEach(function(e) {
            var entity_id = doneEntities.indexOf(e.key);
            var entity_node;

            if (entity_id != -1) {
                entity_node = drawNodes.filter(function(f) { return f.Name == entities[e.key].Name && f.Type == 'Entity'; })[0];
                entity_node.party_nodes[d.key] = party_node;
            } else {
                entity_node = {
                    Type: 'Entity',
                    Name: entities[e.key].Name,
                    links: [],
                    TotalAmount: 0,
                    receipts: [],
                    party_nodes: {},
                    entity_id: e.key,
                    id: i++
                }
                entity_node.party_nodes[d.key] = party_node;
                drawNodes.push(entity_node);
                doneEntities.push(e.key);
            }

            party_node.entity_nodes[e.key] = entity_node;

            entity_node.receipts.push({ party: d.key, amount: e.values });

            var link = {
                source: entity_node.id,
                target: party_node.id
            };
            
            party_node.TotalAmount += e.values;
            entity_node.TotalAmount += e.values;

            party_node.links.push(link);
            entity_node.links.push(link);

            drawLinks.push(link);
        });

        if (d.others) {
            var node = {
                Type: 'Others',
                Name: 'Others - Combined Total',
                TotalAmount: d.others,
                Others: d.other_values,
                links: [],
            };

            var link = {
                source: i,
                target: party_node.id
            };
            node.links = [link, ];
            party_node.links.push(link);
            drawNodes.push(node);
            drawLinks.push(link);
            i++;
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
        nodesG.selectAll(".node").remove();
        return;
    }

    var extents = d3.extent(force.nodes().filter(function(d) { return d.Type == "Entity"; }), function(n) { return n.TotalAmount; });
    var start = extents[0],
        end = extents[1],
        mean = d3.mean(force.nodes(), function(d) { return d.TotalAmount; }),
        median = d3.median(force.nodes(), function(d) { return d.TotalAmount; });    

    radiusScale.domain([start, median, mean, end])
    //radiusScale.domain(extents);
    nodeColors.domain(force.nodes().map(function(n) { return n.Name; }));

    nodeElements = nodesG.selectAll(".node")
                       .data(force.nodes(), function(d, i) { 
                           return d.Name + "-" + i; 
                       });

    nodeElements.enter().append("path").attr("class", "node");
    nodeElements.attr("d", d3.svg.symbol()
                    .size(function(d) { 
                        d.radius = radiusScale(d.TotalAmount);
                        d.radius *= d.Type == "Party" ? 2.5 : 1;
                        return d.radius
                    }).type(function(d) { return d.Type == "Party" ? "square" : "circle"; }))
                .attr("id", function(d, i) { return "node-" + i; })
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

    nodeElements.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        //.attr("cx", function(d) { return d.x; })
        //.attr("cy", function(d) { return d.y; });
}

function processData(error, data) {
    parties = data.parties;
    entities = data.entities;
    receipts = data.receipts;
    receipt_types = data.receipt_types;

    var years = getYears();

    selectedYear = years[years.length-1];
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
    d3.select("#view_select").on("change", filterAndUpdateData);
    d3.select("#search").on("keyup", search);
}


                         
