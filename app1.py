from flask import Flask, render_template, request, jsonify
from agno.agent import Agent
from agno.models.groq import Groq
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.yfinance import YFinanceTools
import os
import re
import yfinance as yf
import markdown
from dotenv import load_dotenv

load_dotenv()

groq_api = os.getenv('GROQ_API_KEY')

app = Flask(__name__)

# Define Stock Analysis Agent
stock_analysis_agent = Agent(
    name='Stock Analysis Agent',
    model=Groq(id="deepseek-r1-distill-llama-70b", api_key=groq_api),
    tools=[
        YFinanceTools(stock_price=True, analyst_recommendations=True, company_info=True),
        DuckDuckGoTools()
    ],
    instructions=[
        "Use DuckDuckGoTools for real-time stock-related news.",
        "Use YFinanceTools for stock prices, company details, and analyst recommendations.",
        "Provide top 3 recent news headlines with short summaries.",
    ],
    show_tool_calls=False,
    markdown=True
)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    ticker = request.form.get('ticker').strip().upper()
    if not ticker:
        return jsonify({'error': 'Please enter a valid stock ticker.'})
    
    try:
        stock_data = yf.Ticker(ticker)
        stock_info = stock_data.info

        # Fetch real-time stock price
        current_price = stock_info.get('regularMarketPrice', None)
        after_hours_price = stock_info.get('postMarketPrice', None)
        previous_close = stock_info.get('previousClose', None)

        # Handle missing real-time price
        if current_price is None:
            current_price = previous_close

        # Construct stock price message
        price_message = f"📊 **Live Stock Price**: ${current_price:.2f}" if current_price is not None else "📊 **Stock Price Unavailable**"
        if after_hours_price:
            price_message += f"\n📉 **After-Hours Price**: ${after_hours_price:.2f}"

        structured_prompt = f"""
        You are a **Stock Analysis AI**. Your job is to analyze **{ticker}** and generate a structured stock report every time, following this exact format:

        📌 **Instructions**:
        - Use **YFinanceTools** to get:
        - **Real-time stock price**
        - **Company details (market cap, sector, key financials)**
        - **Analyst recommendations**
        - **Latest stock news**
        - **Technical analysis & trends**
        - **Follow this format exactly for every report**:

        - Do NOT use DuckDuckGo for stock prices. Only use it for real-time stock-related news.
        - If real-time price is missing, use the last closing price with a note: "**Note: Real-time price data unavailable. Using last closing price instead.**"
        - Ensure the response is in **clean Markdown format** without any extraneous information.
        - Ensure the **Recent News** section always follows this exact format with numbered news items, headlines, summaries, and sources as a website links.

        Strictly Return your response in **clean Json format**.
        Dont change any key values in the json.and also dont include any other keys.

        Expected json format::

        {{
            "Company Overview": {{
                "Market Cap": ""
                "Sector": ""
                "Industry": ""
                "Key Financials":{{
                    "Revenue (TTM)": ""
                    "Net Income (TTM)": ""
                    "EPS (TTM)": ""
                }}
            }},
            "Stock Performance": {{
                {price_message}
                "52-Week Range" : ""
                "Volume (Avg.)" : ""
                "Market Cap" : ""
            }},
            "Recent News": [
            {{
                "News 1" : ""
                "Summary" : ""
                "Source" : ""
            }},
            {{
                "News 2" : ""
                "Summary" : ""
                "Source" : ""
            }},
            {{
                "News 3" : ""
                "Summary" : ""
                "Source" : ""
            }}],
            "Analyst Ratings" : {{
                "Analyst Consensus" : "",
                "Average Price Target" : ""
                "Breakdown:" {{
                    "Buy Percentage" : ""
                    "Hold Percentage" : ""
                    "Sell Percentage" : ""
                }}
            }},
            "Technical Trend Analysis" : {{
                "50-Day Moving Average" : ""
                "200-Day Moving Average" : ""
                "RSI" : ""
                "MACD" : ""
            }},
            "Final Buy/Hold/Sell Recommendation" : {{
                "Recommendation" : ""
                "Reasoning" : ""
            }}
        }}
        Note: please dont display any other information outoff the json response
        """

        # Run the agent with the structured prompt
        response = stock_analysis_agent.run(structured_prompt)
        analysis_content = response.content if hasattr(response, "content") else "No analysis available."
        
        # If content is missing, use default/fallback text
        analysis_content = re.sub(r"Not explicitly provided in the tool output.", "Not available but will continue fetching other relevant data...", analysis_content).strip()

        # Fetch stock history for plots
        history = stock_data.history(period="3mo")
        if history.empty:
            return jsonify({'error': f'No stock data found for {ticker}.'})

        plot_data = {
            'dates': history.index.strftime('%Y-%m-%d').tolist(),
            'open': history['Open'].tolist(),
            'high': history['High'].tolist(),
            'low': history['Low'].tolist(),
            'close': history['Close'].tolist(),
            'volume': history['Volume'].tolist()
        }

        disclaimer = (
            "<div class='alert alert-warning'>Disclaimer: The stock analysis and recommendations provided "
            "are for informational purposes only and should not be considered financial advice. Always do your "
            "own research or consult with a financial professional.</div>"
        )

        # Replace missing data with placeholders or specific fallbacks
        analysis_content = analysis_content.replace("Not explicitly provided in the tool output.", "Data will be updated with the closest available info.")
        
        # Convert markdown content to HTML
        markdown_content = markdown.markdown(analysis_content)
        
        # Clean up unnecessary tags
        cleaned_content = re.sub(r'<p>|</p>', '', markdown_content)
        cleaned_content = re.sub(r'<code>|</code>', '', cleaned_content)
        cleaned_content = re.sub(r'<strong>|</strong>', '', cleaned_content)
        formatted_response = re.sub(r'<table>', '<table class="table table-bordered table-striped">', cleaned_content)
        
        print(formatted_response)

        return jsonify({
            'result': formatted_response,
            'plot_data': plot_data,
            'disclaimer': disclaimer
        })

    except Exception as e:
        return jsonify({'error': f'Error processing request: {str(e)}'})

if __name__ == "__main__":
    app.run(debug=True)