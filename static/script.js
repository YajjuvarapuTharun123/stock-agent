$(document).ready(function () {
    // Predefined list of stock tickers
    const stockTickers = [
      // Top 10 Indian Stocks
      { label: "RELIANCE - Reliance Industries", value: "RELIANCE.NS" },
      { label: "TCS - Tata Consultancy Services", value: "TCS.NS" },
      { label: "HDFCBANK - HDFC Bank", value: "HDFCBANK.NS" },
      { label: "INFY - Infosys", value: "INFY.NS" },
      { label: "HINDUNILVR - Hindustan Unilever", value: "HINDUNILVR.NS" },
      { label: "ICICIBANK - ICICI Bank", value: "ICICIBANK.NS" },
      { label: "KOTAKBANK - Kotak Mahindra Bank", value: "KOTAKBANK.NS" },
      { label: "AXISBANK - Axis Bank", value: "AXISBANK.NS" },
      { label: "LT - Larsen & Toubro", value: "LT.NS" },
      { label: "SBIN - State Bank of India", value: "SBIN.NS" },
  
      // Top 30 Global Stocks
      { label: "AAPL - Apple Inc.", value: "AAPL" },
      { label: "MSFT - Microsoft Corporation", value: "MSFT" },
      { label: "GOOGL - Alphabet Inc.", value: "GOOGL" },
      { label: "AMZN - Amazon.com Inc.", value: "AMZN" },
      { label: "TSLA - Tesla Inc.", value: "TSLA" },
      { label: "BRK-B - Berkshire Hathaway Inc.", value: "BRK-B" },
      { label: "NVDA - NVIDIA Corporation", value: "NVDA" },
      { label: "META - Meta Platforms Inc.", value: "META" },
      { label: "JNJ - Johnson & Johnson", value: "JNJ" },
      { label: "V - Visa Inc.", value: "V" },
      { label: "WMT - Walmart Inc.", value: "WMT" },
      { label: "PG - Procter & Gamble Co.", value: "PG" },
      { label: "MA - Mastercard Inc.", value: "MA" },
      { label: "UNH - UnitedHealth Group Inc.", value: "UNH" },
      { label: "HD - Home Depot Inc.", value: "HD" },
      { label: "DIS - Walt Disney Co.", value: "DIS" },
      { label: "PYPL - PayPal Holdings Inc.", value: "PYPL" },
      { label: "ADBE - Adobe Inc.", value: "ADBE" },
      { label: "CRM - Salesforce Inc.", value: "CRM" },
      { label: "NFLX - Netflix Inc.", value: "NFLX" },
      { label: "BAC - Bank of America Corp.", value: "BAC" },
      { label: "KO - Coca-Cola Co.", value: "KO" },
      { label: "PEP - PepsiCo Inc.", value: "PEP" },
      { label: "XOM - Exxon Mobil Corp.", value: "XOM" },
      { label: "T - AT&T Inc.", value: "T" },
      { label: "CSCO - Cisco Systems Inc.", value: "CSCO" },
      { label: "INTC - Intel Corp.", value: "INTC" },
      { label: "ORCL - Oracle Corp.", value: "ORCL" },
      { label: "ABT - Abbott Laboratories", value: "ABT" }
    ];
  
    // Initialize autocomplete
    $("#ticker")
      .autocomplete({
        source: stockTickers,
        select: function (event, ui) {
          $("#ticker").val(ui.item.value);
          return false;
        }
      })
      .autocomplete("instance")._renderItem = function (ul, item) {
        return $("<li>")
          .append(`<div>${item.label}</div>`)
          .appendTo(ul);
      };
  
    // Form submission
    $("#stockForm").submit(function (event) {
      event.preventDefault();
      let ticker = $("#ticker").val().trim().toUpperCase();
  
      if (ticker === "") {
        alert("Please enter a stock ticker.");
        return;
      }
  
      // Show loading animation
      $("#button-text").addClass("d-none");
      $("#loading-spinner").removeClass("d-none");
      $("#stockForm button").prop("disabled", true);
  
      $.ajax({
        url: "/analyze",
        type: "POST",
        data: { ticker: ticker },
        beforeSend: function () {
          $("#resultBox").hide();
          $("#resultContent").html("<p class='text-light'>Loading analysis...</p>");
        },
        success: function (response) {
          if (response.error) {
            $("#resultContent").html(`<div class="alert alert-danger">${response.error}</div>`);
          } else {
            if(response.result){
                const analysisHTML = buildAnalysisHTML(response.result);
                $("#resultContent").html(analysisHTML);
            } else {
                $("#resultContent").html("<div class='alert alert-warning'>No analysis data available.</div>");
            }
            $("#disclaimer").html(response.disclaimer);
  
            // Render stock chart
            if (response.plot_data && response.plot_data.dates.length > 0) {
              renderStockChart(response.plot_data, ticker);
            } else {
              $("#stockGraph").html("<p class='text-warning'>No stock data available for chart.</p>");
            }
  
            $("#resultBox").fadeIn();
          }
        },
        complete: function () {
          $("#button-text").removeClass("d-none");
          $("#loading-spinner").addClass("d-none");
          $("#stockForm button").prop("disabled", false);
        },
        error: function () {
          $("#resultContent").html(`<div class="alert alert-danger">Error retrieving stock data.</div>`);
          $("#button-text").removeClass("d-none");
          $("#loading-spinner").addClass("d-none");
          $("#stockForm button").prop("disabled", false);
        }
      });
    });
  
    // Render stock chart
    function renderStockChart(data, ticker) {
      const traceCandlestick = {
        x: data.dates,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        type: "candlestick",
        name: `${ticker} Stock`
      };
  
      const layout = {
        title: `Stock Price for ${ticker}`,
        plot_bgcolor: "#1e1e1e",
        paper_bgcolor: "#121212",
        font: { color: "#ffffff" },
        xaxis: { title: "Date", color: "#ffffff", showgrid: false },
        yaxis: { title: "Price (USD)", color: "#ffffff", showgrid: false },
        showlegend: true
      };
  
      Plotly.newPlot("stockGraph", [traceCandlestick], layout);
  
      // Full-screen graph view on button click
      $("#fullScreenGraphBtn").off("click").on("click", function () {
        $("#fullPageGraphContainer").fadeIn();
        Plotly.newPlot("fullPageGraph", [traceCandlestick], {
          ...layout,
          title: `Stock Price for ${ticker} (Full Screen)`,
          height: window.innerHeight - 100
        });
      });
  
      // Close full-screen graph view
      $("#closeFullScreenGraphBtn").off("click").on("click", function () {
        $("#fullPageGraphContainer").fadeOut();
      });
    }
  
    // Build formatted HTML from analysis JSON in desired order
    function buildAnalysisHTML(data) {
      // Use the fixed order as defined in the JSON format.
      const desiredOrder = [
        "Company Overview",
        "Stock Performance",
        "Recent News",
        "Analyst Ratings",
        "Technical Trend Analysis",
        "Final Buy/Hold/Sell Recommendation"
      ];
      let html = '';
      desiredOrder.forEach(section => {
        if (data[section] !== undefined) {
          html += `<div class="card analysis-section">
                      <div class="card-header">
                        <h5 class="mb-0">${section}</h5>
                      </div>
                      <div class="card-body">
                        ${buildObjectHTML(data[section], section)}
                      </div>
                    </div>`;
        }
      });
      return html;
    }
  
    // Recursively build HTML.
    // For keys (except "Source"), if the string value contains a duplicate label (separated by "–" or ":"), use only the text after the delimiter.
    function buildObjectHTML(obj, parentKey = "") {
      let html = '';
      if (typeof obj === 'object' && !Array.isArray(obj)) {
        html += '<div class="analysis-details">';
        for (const key in obj) {
          let value = obj[key];
          // For keys other than "Source", if value is a string, remove duplicate label info.
          if (key.toLowerCase() !== "source" && typeof value === "string") {
            if (value.indexOf('–') > -1) {
              let parts = value.split('–');
              value = parts[parts.length - 1].trim();
            } else if (value.indexOf(':') > -1) {
              let parts = value.split(':');
              value = parts[parts.length - 1].trim();
            }
          }
          // Format "Source" as clickable link.
          if (key.toLowerCase() === "source" && typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))) {
            value = `<a href="${value}" target="_blank">${value}</a>`;
          }
          html += `<div class="analysis-detail"><strong>${key}:</strong> `;
          if (typeof value === 'object') {
            html += buildObjectHTML(value, key);
          } else {
            html += value;
          }
          html += '</div>';
        }
        html += '</div>';
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          html += `<div class="analysis-item"><strong>Item ${index + 1}:</strong> ${buildObjectHTML(item)}</div>`;
        });
      } else {
        html += `<span>${obj}</span>`;
      }
      return html;
    }
  });
  