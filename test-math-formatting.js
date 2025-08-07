require('dotenv').config();
const aiService = require('./services/aiService');

class MathFormattingTest {
    constructor() {
        this.mathQuestions = [
            "What is the formula for the area of a triangle?",
            "How do I calculate the volume of a sphere?",
            "What is the quadratic formula?",
            "Explain the Pythagorean theorem with an example",
            "What is the formula for compound interest?"
        ];
    }

    async run() {
        console.log('🧮 MATHEMATICAL FORMATTING TEST');
        console.log('===============================\n');

        try {
            console.log('✅ Testing mathematical responses for LaTeX avoidance...\n');

            for (let i = 0; i < this.mathQuestions.length; i++) {
                const question = this.mathQuestions[i];
                console.log(`📝 Math Test ${i + 1}: "${question}"`);
                console.log('─'.repeat(60));

                try {
                    const response = await aiService.generateUserResponse(question);
                    
                    console.log('🤖 AI Response:');
                    console.log(response);
                    console.log('');
                    
                    // Check for LaTeX patterns
                    const hasLatex = this.checkForLatex(response);
                    const hasSimpleMath = this.checkForSimpleMath(response);
                    
                    console.log('📊 Math Format Analysis:');
                    console.log(`   Contains LaTeX: ${hasLatex ? '❌' : '✅'}`);
                    console.log(`   Uses simple math: ${hasSimpleMath ? '✅' : '❌'}`);
                    console.log(`   Messenger compatible: ${!hasLatex ? '✅' : '❌'}`);
                    console.log('');

                } catch (error) {
                    console.error(`❌ Error testing math question "${question}":`, error.message);
                    console.log('');
                }
            }

            console.log('🎉 Math Formatting Test Complete!');
            console.log('✅ Mathematical responses should avoid LaTeX and use simple text format');

        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    checkForLatex(text) {
        const latexPatterns = [
            /\\frac\{.*?\}\{.*?\}/g,      // \frac{}{}
            /\\times/g,                   // \times
            /\\div/g,                     // \div
            /\\sqrt\{.*?\}/g,             // \sqrt{}
            /\\pi/g,                      // \pi
            /\\theta/g,                   // \theta
            /\\alpha/g,                   // \alpha
            /\\beta/g,                    // \beta
            /\\gamma/g,                   // \gamma
            /\\delta/g,                   // \delta
            /\\sum/g,                     // \sum
            /\\int/g,                     // \int
            /\\lim/g,                     // \lim
            /\\infty/g,                   // \infty
            /\\approx/g,                  // \approx
            /\\equiv/g,                   // \equiv
            /\\neq/g,                     // \neq
            /\\leq/g,                     // \leq
            /\\geq/g,                     // \geq
            /\\pm/g,                      // \pm
            /\\mp/g,                      // \mp
            /\\cdot/g,                    // \cdot
            /\\circ/g,                    // \circ
            /\\degree/g,                  // \degree
            /\\text\{.*?\}/g,             // \text{}
            /\\mathrm\{.*?\}/g,           // \mathrm{}
            /\\mathbf\{.*?\}/g,           // \mathbf{}
            /\\mathit\{.*?\}/g,           // \mathit{}
            /\\mathcal\{.*?\}/g,          // \mathcal{}
            /\\mathbb\{.*?\}/g,           // \mathbb{}
            /\\left\(/g,                  // \left(
            /\\right\)/g,                 // \right)
            /\\left\[/g,                  // \left[
            /\\right\]/g,                 // \right]
            /\\left\\{/g,                 // \left{
            /\\right\\}/g,                // \right}
            /\\left\\|/g,                 // \left|
            /\\right\\|/g,                // \right|
            /\\left\\langle/g,            // \left\langle
            /\\right\\rangle/g,           // \right\rangle
            /\\left\\lfloor/g,            // \left\lfloor
            /\\right\\rfloor/g,           // \right\rfloor
            /\\left\\lceil/g,             // \left\lceil
            /\\right\\rceil/g,            // \right\rceil
            /\\overbrace\{.*?\}/g,        // \overbrace{}
            /\\underbrace\{.*?\}/g,       // \underbrace{}
            /\\overline\{.*?\}/g,         // \overline{}
            /\\underline\{.*?\}/g,        // \underline{}
            /\\widehat\{.*?\}/g,          // \widehat{}
            /\\widetilde\{.*?\}/g,        // \widetilde{}
            /\\vec\{.*?\}/g,              // \vec{}
            /\\dot\{.*?\}/g,              // \dot{}
            /\\ddot\{.*?\}/g,             // \ddot{}
            /\\dddot\{.*?\}/g,            // \dddot{}
            /\\ddddot\{.*?\}/g,           // \dddot{}
            /\\prime/g,                   // \prime
            /\\doubleprime/g,             // \doubleprime
            /\\tripleprime/g,             // \tripleprime
            /\\backslash/g,               // \backslash
            /\\#/g,                       // \#
            /\\$/g,                       // \$
            /\\%/g,                       // \%
            /\\&/g,                       // \&
            /\\_/g,                       // \_
            /\\\{/g,                      // \{
            /\\}/g,                       // \}
            /\\~/g,                       // \~
            /\\^/g,                       // \^
            /\\`/g,                       // \`
            /\\"/g,                       // \"
            /\\'/g,                       // \'
            /\\</g,                       // \<
            /\\>/g,                       // \>
            /\\|/g,                       // \|
            /\\\\/g                       // \\
        ];

        for (const pattern of latexPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        return false;
    }

    checkForSimpleMath(text) {
        const simpleMathPatterns = [
            /\d+\/\d+/g,                  // Fractions like 1/2
            /\d+\s*\*\s*\d+/g,            // Multiplication like 2 * 3
            /\d+\s*\+\s*\d+/g,            // Addition like 2 + 3
            /\d+\s*-\s*\d+/g,             // Subtraction like 5 - 2
            /\d+\s*\/\s*\d+/g,            // Division like 10 / 2
            /\d+\^2/g,                    // Squared like 5^2
            /\d+\^3/g,                    // Cubed like 3^3
            /pi/g,                        // pi (lowercase)
            /Pi/g,                        // Pi (uppercase)
            /PI/g,                        // PI (uppercase)
            /sqrt/g,                      // sqrt
            /square root/g,               // square root
            /cube root/g,                 // cube root
            /×/g,                         // × symbol
            /÷/g,                         // ÷ symbol
            /±/g,                         // ± symbol
            /≤/g,                         // ≤ symbol
            /≥/g,                         // ≥ symbol
            /≠/g,                         // ≠ symbol
            /≈/g,                         // ≈ symbol
            /∞/g,                         // ∞ symbol
            /°/g,                         // ° symbol
            /²/g,                         // ² symbol
            /³/g,                         // ³ symbol
            /¼/g,                         // ¼ symbol
            /½/g,                         // ½ symbol
            /¾/g,                         // ¾ symbol
            /⅓/g,                         // ⅓ symbol
            /⅔/g,                         // ⅔ symbol
            /⅕/g,                         // ⅕ symbol
            /⅖/g,                         // ⅖ symbol
            /⅗/g,                         // ⅗ symbol
            /⅘/g,                         // ⅘ symbol
            /⅙/g,                         // ⅙ symbol
            /⅚/g,                         // ⅚ symbol
            /⅛/g,                         // ⅛ symbol
            /⅜/g,                         // ⅜ symbol
            /⅝/g,                         // ⅝ symbol
            /⅞/g                          // ⅞ symbol
        ];

        for (const pattern of simpleMathPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        return false;
    }
}

// Run the test
async function main() {
    const test = new MathFormattingTest();
    await test.run();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = MathFormattingTest;
