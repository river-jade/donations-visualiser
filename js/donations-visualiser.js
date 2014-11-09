var Network, RadialPlacement, activate;

RadialPlacement = function() {
  var center, current, increment, place, placement, radialLocation, radius, setKeys, start, values;
  values = d3.map();
  increment = 20;
  radius = 200;
  center = {
    "x": 0,
    "y": 0
  };
  start = -120;
  current = start;
  radialLocation = function(center, angle, radius) {
    var x, y;
    x = center.x + radius * Math.cos(angle * Math.PI / 180);
    y = center.y + radius * Math.sin(angle * Math.PI / 180);
    return {
      "x": x,
      "y": y
    };
  };
  placement = function(key) {
    var value;
    value = values.get(key);
    if (!values.has(key)) {
      value = place(key);
    }
    return value;
  };
  place = function(key) {
    var value;
    value = radialLocation(center, current, radius);
    values.set(key, value);
    current += increment;
    return value;
  };
  setKeys = function(keys) {
    var firstCircleCount, firstCircleKeys, secondCircleKeys;
    values = d3.map();
    firstCircleCount = 360 / increment;
    if (keys.length < firstCircleCount) {
      increment = 360 / keys.length;
    }
    firstCircleKeys = keys.slice(0, firstCircleCount);
    firstCircleKeys.forEach(function(k) {
      return place(k);
    });
    secondCircleKeys = keys.slice(firstCircleCount);
    radius = radius + radius / 1.8;
    increment = 360 / secondCircleKeys.length;
    return secondCircleKeys.forEach(function(k) {
      return place(k);
    });
  };
  placement.keys = function(_) {
    if (!arguments.length) {
      return d3.keys(values);
    }
    setKeys(_);
    return placement;
  };
  placement.center = function(_) {
    if (!arguments.length) {
      return center;
    }
    center = _;
    return placement;
  };
  placement.radius = function(_) {
    if (!arguments.length) {
      return radius;
    }
    radius = _;
    return placement;
  };
  placement.start = function(_) {
    if (!arguments.length) {
      return start;
    }
    start = _;
    current = start;
    return placement;
  };
  placement.increment = function(_) {
    if (!arguments.length) {
      return increment;
    }
    increment = _;
    return placement;
  };
  return placement;
};

Network = function() {
  var w = window,
      d = document, 
      e = d.documentElement, 
      g = d.getElementsByTagName('body')[0],
      x = g.clientWidth,
      y = w.innerHeight || e.clientHeight || g.clientHeight;

  var allData,     charge,        curLinksData,  curNodesData, filter,     filterLinks, 
      filterNodes, force,         forceTick,     groupCenters, height,     hideDetails, 
      layout,      link,          linkedByIndex, linksG,       mapNodes,   moveToRadialLayout, 
      neighboring, network,       node,          nodeColors,   nodeCounts, nodesG, 
      radialTick,  setFilter,     setLayout,     setSort,      setupData,  showDetails, 
      sort,        sortedArtists, strokeFor,     tooltip,      update,     updateCenters, 
      updateLinks, updateNodes,   width,         container;

  var zoom, drag;

  var heightElements = [ 'footer', 'header', '#controls' ];
  var otherHeights = 0;

  heightElements.forEach(function(l) {
      console.log(d3.select(l));
      otherHeights += d3.select(l)[0][0].clientHeight;
  });

  width = x;
  height = y-otherHeights;

  allData = [];
  curLinksData = [];
  curNodesData = [];
  linkedByIndex = {};
  nodesG = null;
  linksG = null;
  node = null;
  link = null;
  layout = "force";
  filter = "all";
  sort = "parties";
  groupCenters = null;
  force = d3.layout.force();
  nodeColors = d3.scale.category20();

  tooltip = Tooltip("vis-tooltip", 230);

  zoom = d3.behavior.zoom()
           .scaleExtent([.1, 5])
           .on("zoom", zoomed);
  drag = d3.behavior.drag()
           .origin(function(d) { return d; })
           .on("dragstart", dragstarted)
           .on("drag", dragged)
           .on("dragend", dragended);

  charge = function(node) {
    return -Math.pow(node.radius, 2.0) / 2;
  };

  resizeWindow = function() {
      x = g.clientWidth,
      y = w.innerHeight || e.clientHeight || g.clientHeight;

      width = x;
      height = y-otherHeights;

      //console.log(network.vis);

      d3.select("div#vis").select("svg").attr("width", width).attr("height", height);
  }

  network = function(selection, data) {
    var vis;
    allData = setupData(data);
    vis = d3.select(selection).append("svg")
                              .attr("width", width)
                              .attr("height", height);
    var rect = vis.append("g").append("rect")
               .style("fill", "none")
               .style("pointer-events", "all")
               .attr("width", width)
               .attr("height", height)
               .call(zoom);
    container = vis.append("g");

    linksG = container.append("g").attr("id", "links");
    nodesG = container.append("g").attr("id", "nodes");
    force.size([width, height]);
    setLayout("force");
    setFilter("all");
    d3.select(window).on("resize", resizeWindow);
    return update();
  };

  function zoomed() {
      container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }

  function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select(this).classed("dragging", true);
  }

  function dragged(d) {
      d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
  }

  function dragended(d) {
      d3.select(this).classed("dragging", false);
  }


  update = function() {
    var artists;
    curNodesData = filterNodes(allData.nodes);
    curLinksData = filterLinks(allData.links, curNodesData);
    if (layout === "radial") {
      artists = sortedArtists(curNodesData, curLinksData);
      updateCenters(artists);
    }
    force.nodes(curNodesData);
    updateNodes();
    if (layout === "force") {
      force.links(curLinksData);
      updateLinks();
    } else {
      force.links([]);
      if (link) {
        link.data([]).exit().remove();
        link = null;
      }
    }
    return force.start();
  };
  network.toggleLayout = function(newLayout) {
    force.stop();
    setLayout(newLayout);
    return update();
  };
  network.toggleFilter = function(newFilter) {
    force.stop();
    setFilter(newFilter);
    return update();
  };
  network.toggleSort = function(newSort) {
    force.stop();
    setSort(newSort);
    return update();
  };
  network.updateSearch = function(searchTerm) {
    var searchRegEx;
    searchRegEx = new RegExp(searchTerm.toLowerCase());
    return node.each(function(d) {
      var element, match;
      element = d3.select(this);
      match = d.name.toLowerCase().search(searchRegEx);
      if (searchTerm.length > 0 && match >= 0) {
        element.style("fill", "#ff1d8e").style("stroke-width", 3.0).style("stroke", "#000");
        return d.searched = true;
      } else {
        d.searched = false;
        return element.style("fill", function(d) {
          return nodeColors(d.amount);
        }).style("stroke-width", 1.0);
      }
    });
  };
  network.updateData = function(newData) {
    allData = setupData(newData);
    link.remove();
    node.remove();
    return update();
  };
  setupData = function(data) {
    var circleRadius, countExtent, nodesMap;
    countExtent = d3.extent(data.nodes, function(d) {
      return d.playcount;
    });
    circleRadius = d3.scale.sqrt().domain(countExtent).range([8, 40]);
    data.nodes.forEach(function(n) {
      var randomnumber;
      n.x = randomnumber = Math.floor(Math.random() * width);
      n.y = randomnumber = Math.floor(Math.random() * height);
      return n.radius = circleRadius(n.playcount);
    });
    nodesMap = mapNodes(data.nodes);
    data.links.forEach(function(l) {
      l.source = nodesMap.get(l.source);
      l.target = nodesMap.get(l.target);
      return linkedByIndex["" + l.source.id + "," + l.target.id] = 1;
    });
    return data;
  };
  mapNodes = function(nodes) {
    var nodesMap;
    nodesMap = d3.map();
    nodes.forEach(function(n) {
      return nodesMap.set(n.id, n);
    });
    return nodesMap;
  };
  nodeCounts = function(nodes, attr) {
    var counts;
    counts = {};
    nodes.forEach(function(d) {
      var _name;
      if (counts[_name = d[attr]] == null) {
        counts[_name] = 0;
      }
      return counts[d[attr]] += 1;
    });
    return counts;
  };
  neighboring = function(a, b) {
    return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id];
  };
  filterNodes = function(allNodes) {
    var cutoff, filteredNodes, playcounts;
    filteredNodes = allNodes;
    if (filter === "popular" || filter === "obscure") {
      playcounts = allNodes.map(function(d) {
        return d.playcount;
      }).sort(d3.ascending);
      cutoff = d3.quantile(playcounts, 0.5);
      filteredNodes = allNodes.filter(function(n) {
        if (filter === "popular") {
          return n.playcount > cutoff;
        } else if (filter === "obscure") {
          return n.playcount <= cutoff;
        }
      });
    }
    return filteredNodes;
  };
  sortedArtists = function(nodes, links) {
    var artists, counts;
    artists = [];
    if (sort === "links") {
      counts = {};
      links.forEach(function(l) {
        var _name, _name1;
        if (counts[_name = l.source.amount] == null) {
          counts[_name] = 0;
        }
        counts[l.source.amount] += 1;
        if (counts[_name1 = l.target.amount] == null) {
          counts[_name1] = 0;
        }
        return counts[l.target.amount] += 1;
      });
      nodes.forEach(function(n) {
        var _name;
        return counts[_name = n.amount] != null ? counts[_name] : counts[_name] = 0;
      });
      artists = d3.entries(counts).sort(function(a, b) {
        return b.value - a.value;
      });
      artists = artists.map(function(v) {
        return v.key;
      });
    } else {
      counts = nodeCounts(nodes, "amount");
      artists = d3.entries(counts).sort(function(a, b) {
        return b.value - a.value;
      });
      artists = artists.map(function(v) {
        return v.key;
      });
    }
    return artists;
  };
  updateCenters = function(artists) {
    if (layout === "radial") {
      return groupCenters = RadialPlacement().center({
        "x": width / 2,
        "y": height / 2 - 100
      }).radius(300).increment(18).keys(artists);
    }
  };
  filterLinks = function(allLinks, curNodes) {
    curNodes = mapNodes(curNodes);
    return allLinks.filter(function(l) {
      return curNodes.get(l.source.id) && curNodes.get(l.target.id);
    });
  };
  updateNodes = function() {
    node = nodesG.selectAll("circle.node").data(curNodesData, function(d) {
      return d.id;
    });
    node.enter().append("circle").attr("class", "node").attr("cx", function(d) {
      return d.x;
    }).attr("cy", function(d) {
      return d.y;
    }).attr("r", function(d) {
      return d.radius;
    }).style("fill", function(d) {
      return nodeColors(d.amount);
    }).style("stroke", function(d) {
      return strokeFor(d);
    }).style("stroke-width", 1.0);
    node.on("mouseover", showDetails).on("mouseout", hideDetails);
    return node.exit().remove();
  };
  updateLinks = function() {
    link = linksG.selectAll("line.link").data(curLinksData, function(d) {
      return "" + d.source.id + "_" + d.target.id;
    });
    link.enter().append("line").attr("class", "link").attr("stroke", "#ddd").attr("stroke-opacity", 0.8).attr("x1", function(d) {
      return d.source.x;
    }).attr("y1", function(d) {
      return d.source.y;
    }).attr("x2", function(d) {
      return d.target.x;
    }).attr("y2", function(d) {
      return d.target.y;
    });
    return link.exit().remove();
  };
  setLayout = function(newLayout) {
    layout = newLayout;
    if (layout === "force") {
      return force.on("tick", forceTick).charge(-200).linkDistance(80);
    } else if (layout === "radial") {
      return force.on("tick", radialTick).charge(charge);
    }
  };
  setFilter = function(newFilter) {
    return filter = newFilter;
  };
  setSort = function(newSort) {
    return sort = newSort;
  };
  forceTick = function(e) {
    node.attr("cx", function(d) {
      return d.x;
    }).attr("cy", function(d) {
      return d.y;
    });
    return link.attr("x1", function(d) {
      return d.source.x;
    }).attr("y1", function(d) {
      return d.source.y;
    }).attr("x2", function(d) {
      return d.target.x;
    }).attr("y2", function(d) {
      return d.target.y;
    });
  };
  radialTick = function(e) {
    node.each(moveToRadialLayout(e.alpha));
    node.attr("cx", function(d) {
      return d.x;
    }).attr("cy", function(d) {
      return d.y;
    });
    if (e.alpha < 0.03) {
      force.stop();
      return updateLinks();
    }
  };
  moveToRadialLayout = function(alpha) {
    var k;
    k = alpha * 0.1;
    return function(d) {
      var centerNode;
      centerNode = groupCenters(d.amount);
      d.x += (centerNode.x - d.x) * k;
      return d.y += (centerNode.y - d.y) * k;
    };
  };
  strokeFor = function(d) {
    return d3.rgb(nodeColors(d.amount)).darker().toString();
  };
  showDetails = function(d, i) {
    var content;
    content = '<p class="main">' + d.name + '</span></p>';
    content += '<hr class="tooltip-hr">';
    content += '<p class="main">' + d.amount + '</span></p>';
    tooltip.showTooltip(content, d3.event);
    if (link) {
      link.attr("stroke", function(l) {
        if (l.source === d || l.target === d) {
          return "#555";
        } else {
          return "#ddd";
        }
      }).attr("stroke-opacity", function(l) {
        if (l.source === d || l.target === d) {
          return 1.0;
        } else {
          return 0.5;
        }
      });
    }
    node.style("stroke", function(n) {
      if (n.searched) {
        return "#000";
      } else if (neighboring(d, n)) {
        return "#555";
      } else {
        return strokeFor(n);
      }
    }).style("stroke-width", function(n) {
      if (n.searched) {
        return 3.0;
      } else if (neighboring(d, n)) {
        return 2.0;
      } else {
        return 1.0;
      }
    });
    return d3.select(this).style("stroke", "black").style("stroke-width", 2.0);
  };
  hideDetails = function(d, i) {
    tooltip.hideTooltip();
    node.style("stroke", function(n) {
      if (!n.searched) {
        return strokeFor(n);
      } else {
        return "#000";
      }
    }).style("stroke-width", function(n) {
      if (!n.searched) {
        return 1.0;
      } else {
        return 3.0;
      }
    });
    if (link) {
      return link.attr("stroke", "#ddd").attr("stroke-opacity", 0.8);
    }
  };
  return network;
};

activate = function(group, link) {
  d3.selectAll("#" + group + " a").classed("active", false);
  return d3.select("#" + group + " #" + link).classed("active", true);
};

$(function() {
  var myNetwork;
  myNetwork = Network();
  d3.selectAll("#layouts a").on("click", function(d) {
    var newLayout;
    newLayout = d3.select(this).attr("id");
    activate("layouts", newLayout);
    return myNetwork.toggleLayout(newLayout);
  });
  d3.selectAll("#filters a").on("click", function(d) {
    var newFilter;
    newFilter = d3.select(this).attr("id");
    activate("filters", newFilter);
    return myNetwork.toggleFilter(newFilter);
  });
  d3.selectAll("#sorts a").on("click", function(d) {
    var newSort;
    newSort = d3.select(this).attr("id");
    activate("sorts", newSort);
    return myNetwork.toggleSort(newSort);
  });
  $("#party_select").on("change", function(e) {
    var songFile;
    songFile = $(this).val();
    return d3.json("data/" + songFile, function(json) {
      return myNetwork.updateData(json);
    });
  });
  $("#search").keyup(function() {
    var searchTerm;
    searchTerm = $(this).val();
    return myNetwork.updateSearch(searchTerm);
  });
  return d3.json("data/all.json", function(json) {
    return myNetwork("#vis", json);
  });
});

