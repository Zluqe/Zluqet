document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.querySelector('textarea');
    
    textarea.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            this.form.submit();
        }
    });
});