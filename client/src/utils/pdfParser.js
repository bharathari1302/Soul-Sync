import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const extractQuestionsFromPdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    // Simple heuristic parsing. Look for lines starting with number or just split by newlines if short
    // For now, let's just split by newlines and filter empty
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 5);

    // Convert lines to question objects
    // Naive: Every line is a question
    return lines.map(line => ({
        id: Date.now() + Math.random(),
        text: line,
        type: 'fill-up', // Default to fill-up
        options: []
    })).slice(0, 20); // Cap at 20 for safety
};
