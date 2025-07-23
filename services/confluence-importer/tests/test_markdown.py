import unittest
import pytest
from unittest.mock import patch, MagicMock
import os
import tempfile
import sys
import io

# Add the parent directory to sys.path to import the module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.markdown import html_to_markdown, md

class TestHtmlToMarkdown(unittest.TestCase):
    """Test cases for the html_to_markdown function."""
    
    def test_basic_html_conversion(self):
        """Test basic HTML to Markdown conversion."""
        html = "<h1>Hello World</h1>"
        
        # Mock the MarkItDown instance to return a predictable result
        with patch('src.markdown.md') as mock_md:
            mock_result = MagicMock()
            mock_result.text_content = "# Hello World"
            mock_md.convert.return_value = mock_result
            
            result = html_to_markdown(html)
            
            # Verify the result
            self.assertEqual(result, "# Hello World")
            
            # Verify that the temporary file was created with the correct content
            mock_md.convert.assert_called_once()
            temp_file_path = mock_md.convert.call_args[0][0]
            self.assertTrue(temp_file_path.endswith('.html'))
    
    def test_empty_string(self):
        """Test conversion of an empty string."""
        html = ""
        
        # Mock the MarkItDown instance to return a predictable result
        with patch('src.markdown.md') as mock_md:
            mock_result = MagicMock()
            mock_result.text_content = ""
            mock_md.convert.return_value = mock_result
            
            result = html_to_markdown(html)
            
            # Verify the result
            self.assertEqual(result, "")
    
    def test_complex_html(self):
        """Test conversion of complex HTML with multiple elements."""
        html = """
        <div>
            <h1>Title</h1>
            <p>This is a <strong>paragraph</strong> with <em>formatting</em>.</p>
            <ul>
                <li>Item 1</li>
                <li>Item 2</li>
            </ul>
        </div>
        """
        
        expected_markdown = """# Title

This is a **paragraph** with *formatting*.

- Item 1
- Item 2"""
        
        # Mock the MarkItDown instance to return a predictable result
        with patch('src.markdown.md') as mock_md:
            mock_result = MagicMock()
            mock_result.text_content = expected_markdown
            mock_md.convert.return_value = mock_result
            
            result = html_to_markdown(html)
            
            # Verify the result
            self.assertEqual(result, expected_markdown)
    
    def test_file_cleanup(self):
        """Test that temporary files are properly cleaned up."""
        html = "<p>Test</p>"
        
        # Mock tempfile.NamedTemporaryFile to track the created file
        with patch('tempfile.NamedTemporaryFile') as mock_temp_file:
            # Setup the mock temporary file
            mock_file = MagicMock()
            mock_file.name = '/tmp/mock_temp_file.html'
            mock_temp_file.return_value = mock_file
            
            # Mock os.unlink to verify it's called with the correct file
            with patch('os.unlink') as mock_unlink:
                # Mock the MarkItDown instance
                with patch('src.markdown.md') as mock_md:
                    mock_result = MagicMock()
                    mock_result.text_content = "Test"
                    mock_md.convert.return_value = mock_result
                    
                    html_to_markdown(html)
                    
                    # Verify that os.unlink was called to delete the temporary file
                    mock_unlink.assert_called_once_with('/tmp/mock_temp_file.html')

if __name__ == '__main__':
    pytest.main()